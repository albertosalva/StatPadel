// controllers/influxController.js
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const influxUrl = process.env.INFLUX_URL;   
const influxToken = process.env.INFLUX_TOKEN;
const influxOrg = process.env.INFLUX_ORG;
const influxBucket = process.env.INFLUX_BUCKET;

const influxDB  = new InfluxDB({ url: influxUrl, token: influxToken });
const queryApi = influxDB.getQueryApi(influxOrg);

async function saveAnalysisToInflux(data, matchId) {

  const writeApi = influxDB.getWriteApi(influxOrg, influxBucket, 'ms');

  const fps = data.fps;
  const frameIntervalMs = 1000 / fps;
  const startTime = Date.now() - 60 * 60 * 1000
  let totalPoints = 0;

  console.log(`🔍 [Influx] Iniciando escritura para match ${matchId} (FPS: ${fps}, Intervalo: ${frameIntervalMs.toFixed(2)} ms)`);

  try {
    for (let i = 0; i < data.frames.length; i++) {
      const frame     = data.frames[i];
      const timestamp = new Date(startTime + i * frameIntervalMs);
      //console.log(`  ↳ Frame ${i + 1}/${data.frames.length} @ ${timestamp.toISOString()}`);

      // ───── GUARDAR JUGADORES ─────────────────
      let playersWritten = 0;
      for (const [position, coords] of Object.entries(frame.players)) {
        if (coords.x !== -1 && coords.y !== -1) {
          writeApi.writePoint(
            new Point('partidos')
              .tag('partido_id', matchId.toString())
              .tag('entity', 'player')
              .tag('player_id', position)
              .floatField('x', coords.x)
              .floatField('y', coords.y)
              .timestamp(timestamp)
          );
          playersWritten++;
          totalPoints += 2;
        }
      }
      //console.log(`     • Jugadores escritos: ${playersWritten}`);

      // ───── GUARDAR BOLA ───────────────────────
      const ball = frame.ball;
      if (ball.x !== -1 && ball.y !== -1) {
        writeApi.writePoint(
          new Point('partidos')
            .tag('partido_id', matchId.toString())
            .tag('entity', 'ball')
            .floatField('x', ball.x)
            .floatField('y', ball.y)
            .intField('bote', ball.bote || 0)
            .timestamp(timestamp)
        );
        //console.log(`     • Bola escrita: ✅`);
        totalPoints += 3;
      } else {
        //console.log(`     • Bola escrita: ❌ (no hay datos)`);
      }
    }

    // ───── FLUSH Y CIERRE ────────────────────────
    console.log(`🔄 Forzando flush sincrónico...`);
    await writeApi.flush();
    console.log(`✅ Flush completado`);

    console.log(`🔄 Cerrando writeApi y enviando ${totalPoints} puntos a InfluxDB…`);
    await writeApi.close();
    console.log(`✅ Todos los puntos de match ${matchId} guardados correctamente en InfluxDB.`);

    return totalPoints;

  } catch (err) {
    console.error(`❌ Error al escribir en InfluxDB para match ${matchId}:`, err);
    return 0;
  }
}

async function waitForInfluxData(matchId, expectedPoints, maxRetries = 100, delay = 500) {
  console.log(`⌛ Esperando datos para ${matchId} (${expectedPoints} puntos)`);
  
  for (let i = 0; i < maxRetries; i++) {
    const flux = `from(bucket:"${influxBucket}")
      |> range(start: -2h)
      |> filter(fn: (r) => 
          r._measurement == "partidos" and 
          r.partido_id == "${matchId}"
      )
      |> count()`;
    
    try {
      const result = await queryApi.collectRows(flux);
      let totalRecords = 0;

      for (const row of result) {
        totalRecords += row._value;
      }

      console.log(`↩️ Intento ${i + 1}/${maxRetries}: ${totalRecords} registros`);

      if (totalRecords >= expectedPoints) {
        console.log(`✅ Datos disponibles (${totalRecords} registros)`);
        return;
      }
    } catch (err) {
      console.error(`⚠️ Error en consulta: ${err.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(`Timeout: Solo se encontraron ${totalRecords}/${expectedPoints} registros`);
}

async function getPlayersDistanceAndAvgSpeed(matchId) {
    const fluxPlayers = `
    import "math"

    from(bucket: "${influxBucket}")
      |> range(start: 0)
      |> filter(fn: (r) =>
          r._measurement == "partidos" and
          r.partido_id   == "${matchId}" and
          r.entity       == "player"
      )
      |> filter(fn: (r) => r._field == "x" or r._field == "y")
      |> pivot(
          rowKey:      ["_time"],
          columnKey:   ["_field"],
          valueColumn: "_value"
        )
      |> sort(columns: ["_time"])
      |> difference(columns: ["x", "y"])
      |> map(fn: (r) => ({ player_id: r.player_id, _value: math.sqrt(x: r.x * r.x + r.y * r.y) }))
      |> group(columns: ["player_id"])
      |> sum(column: "_value")
      |> keep(columns: ["player_id", "_value"])
    `

    const fluxBall = `
    import "math"

    from(bucket: "${influxBucket}")
      |> range(start: 0)
      |> filter(fn: (r) => 
          r._measurement == "partidos" and 
          r.partido_id == "${matchId}" and 
          r.entity == "ball" and 
          (r._field == "x" or r._field == "y")
      )
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"])
      |> difference(columns: ["x", "y"], keepFirst: false)
      |> map(fn: (r) => ({
          _time: r._time,
          step_distance: math.sqrt(x: r.x * r.x + r.y * r.y)
      }))
      |> filter(fn: (r) => r.step_distance <= 1.0)
      |> sum(column: "step_distance")
      |> yield(name: "total_distance")
    `

    const time = `
    from(bucket: "${influxBucket}")
      |> range(start: 0)
      |> filter(fn: (r) => 
          r._measurement == "partidos" and
          r.partido_id == "${matchId}" and
          r.entity == "ball"
      )
      |> keep(columns: ["_time"])
      |> sort(columns: ["_time"])
      |> limit(n: 1)
      |> yield(name: "inicio")

    from(bucket: "${influxBucket}")
      |> range(start: 0)
      |> filter(fn: (r) => 
          r._measurement == "partidos" and
          r.partido_id == "${matchId}" and
          r.entity == "ball"
      )
      |> keep(columns: ["_time"])
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 1)
      |> yield(name: "fin")
    `
    

    const playerRows = await queryApi.collectRows(fluxPlayers)
    const distances = {}
    for (const row of playerRows) {
        distances[row.player_id] = parseFloat(row._value)
    }

    const ballRows = await queryApi.collectRows(fluxBall);
    let distancesBall = 0.0;
    if (ballRows.length > 0) {
        distancesBall = parseFloat(ballRows[0].step_distance);
    }

    const rows = await queryApi.collectRows(time)
    let startTime = null
    let endTime   = null

    for (const row of rows) {
        if (row.result === 'inicio') startTime = new Date(row._time);
        if (row.result === 'fin')    endTime   = new Date(row._time);
    }

    if (!startTime || !endTime) {
        throw new Error('No se pudo obtener el tiempo de inicio o fin del partido.');
    }

    const durationMs = endTime - startTime;
    const durationSeconds = durationMs / 1000;

    const averageSpeeds = {};
    for (const [playerId, distance] of Object.entries(distances)) {
        averageSpeeds[playerId] = parseFloat((distance / durationSeconds).toFixed(2));
    }
    averageSpeeds.ball = parseFloat((distancesBall / durationSeconds).toFixed(2));
    
    const result = {
        distances: {
            ...distances,
            ball: distancesBall
        },
        avgSpeeds: {
            ...averageSpeeds
        }
    };
    


    //console.log(`Distancias recorridas en el partido ${matchId}:`, result)
    
    return result
}


async function getMaxSpeed(matchId) {

  const fluxPlayersMax = `
    import "math"

    data = from(bucket: "${influxBucket}")
      |> range(start: 0)
      |> filter(fn: (r) =>
          r._measurement == "partidos" and
          r.partido_id   == "${matchId}" and
          r.entity       == "player"
      )
      |> filter(fn: (r) => r._field == "x" or r._field == "y")
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> group(columns: ["player_id"])
      |> sort(columns: ["_time"])

    speed20ms = data
      |> difference(columns: ["x", "y"])
      |> elapsed(unit: 1ms)
      |> map(fn: (r) => ({
           _time:     r._time,
           player_id: r.player_id,
           v:         if r.elapsed > 0.0 then math.hypot(p: r.x, q: r.y) / (float(v: r.elapsed) / 1000.0) else 0.0
      }))
      |> map(fn: (r) => ({
           _time:     r._time,
           player_id: r.player_id,
           _value:    if r.v <= 9.0 then r.v else 9.0
      }))

    avg1s = speed20ms
      |> window(every: 1s)
      |> mean(column: "_value")
      |> keep(columns: ["_start", "player_id", "_value"])

    maxAvg1s = avg1s
      |> group(columns: ["player_id"])
      |> max(column: "_value")
      |> keep(columns: ["player_id", "_value"])
      |> yield(name: "max_avg_1s_speed_players")
  `

  const fluxBallMax = `
    import "math"

    data = from(bucket: "${influxBucket}")
    |> range(start: 0)
    |> filter(fn: (r) =>
        r._measurement == "partidos" and
        r.partido_id   == "${matchId}" and
        r.entity       == "ball"
    )
    |> filter(fn: (r) => r._field == "x" or r._field == "y")
    |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
    |> sort(columns: ["_time"])

    speed20ms = data
    |> difference(columns: ["x", "y"])
    |> elapsed(unit: 1ms)
    |> map(fn: (r) => ({
        _time: r._time,
        v:     if r.elapsed > 0.0 then
                    math.hypot(p: r.x, q: r.y) / (float(v: r.elapsed) / 1000.0)
                else 0.0
    }))
    |> filter(fn: (r) => r.v <= 40.0)
    |> map(fn: (r) => ({
        _time:  r._time,
        _value: if r.v <= 35.0 then r.v else 35.0  
    }))

    avg1s = speed20ms
    |> window(every: 1s)
    |> mean(column: "_value")
    |> keep(columns: ["_start", "_value"])

    maxAvg1s = avg1s
    |> group()
    |> max(column: "_value")
    |> yield(name: "max_avg_speed_per_second")
  `

  const playerRows = await queryApi.collectRows(fluxPlayersMax)
  const maxSpeedsPlayers = {}
  for (const row of playerRows) {
    maxSpeedsPlayers[row.player_id] = parseFloat(row._value)
  }

  const ballRows = await queryApi.collectRows(fluxBallMax)
  const maxSpeedBall = ballRows.length
    ? parseFloat(ballRows[0]._value)
    : 0.0

  const result = {
    ...maxSpeedsPlayers,
    ball:    maxSpeedBall
  }

  console.log(`Velocidades máximas medias por segundo en el partido ${matchId}:`, result)
  return result
}

async function getHeatmapData(matchId) {
    const fluxQuery = `
    from(bucket: "${influxBucket}")
      |> range(start: 0)
      |> filter(fn: (r) => 
          r._measurement == "partidos" and
          r.partido_id == "${matchId}" and
          r.entity == "player" and
          (r._field == "x" or r._field == "y"))
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> keep(columns: ["_time", "x", "y", "player_id"])
  `

    const cell_size = 0.25;
    const width_meters = 10.0;
    const height_meters = 20.0;
    //const num_cols = Math.floor(width_meters / cell_size);
    //const num_rows = Math.floor(height_meters / cell_size);

  const rows = await queryApi.collectRows(fluxQuery)
  console.log(rows);
  const heatmap = {}

  for (const row of rows) {
    const player = row.player_id
    const x = parseFloat(row.x)
    const y = parseFloat(row.y)

    // Ignorar fuera de pista
    if (x < 0 || x >= width_meters || y < 0 || y >= height_meters) continue

    // Ignorar si cruzan la mitad de pista, errores de medición
    if (player.startsWith('bottom') && y < height_meters / 2) continue
    if (player.startsWith('top') && y > height_meters / 2) continue

    const col = Math.floor(x / cell_size)
    const rowIdx = Math.floor(y / cell_size)

    if (!heatmap[player]) {
		heatmap[player] = []
	}

	const existing = heatmap[player].find(e => e.row === rowIdx && e.col === col)
	if (existing) {
		existing.value++
	} else {
		heatmap[player].push({ row: rowIdx, col: col, value: 1 })
	}

  }

  const result = {
	cell_size: cell_size,
	heatmap: heatmap
  }

  return result;
}



module.exports = { saveAnalysisToInflux, waitForInfluxData, getPlayersDistanceAndAvgSpeed, getMaxSpeed, getHeatmapData };