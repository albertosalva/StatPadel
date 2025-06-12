// controllers/videoController.js

const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
const fs = require('fs');
const Match = require('../models/Match');

const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const influxUrl = process.env.INFLUX_URL;   
const influxToken = process.env.INFLUX_TOKEN;
const influxOrg = process.env.INFLUX_ORG;
const influxBucket = process.env.INFLUX_BUCKET;

const host = process.env.API_HOST;
const port = process.env.API_PORT_VIDEO;
const FLASK_FastAPI = `http://${host}:${port}`;


// Cliente Influx para leer/consultar
const influxReadClient  = new InfluxDB({ url: influxUrl, token: influxToken });
const queryApi = influxReadClient.getQueryApi(influxOrg);



//Guardar vídeo en temp/
exports.uploadVideoTemp = async (req, res) => {
  console.log('[uploadVideoTemp] recibido:', req.file.originalname);
  // Multer ya guardó en temp/, devolvemos el nombre
  //res.json({ fileName: req.file.originalname });
  console.log('Nombre del fichero cambiado:', req.file.filename)
  res.json({ fileName: req.file.filename });
};

exports.loadFrame = async (req, res) => {
  const { fileName } = req.body;
  if (!fileName) {
    return res.status(400).json({ error: 'Falta fileName en el body' });
  }

  // Leer de la carpeta temp de Node
  const filePath = path.join(__dirname, '..', 'temp', fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Vídeo no encontrado en temp' });
  }

  // FormData con el fichero
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), fileName);

  try {
    const response = await axios.post(
      `${FLASK_FastAPI}/extract_frame_file`,
      form,
      { headers: form.getHeaders() }
    );
    return res.json(response.data);
  } catch (err) {
    console.error('[proxyExtractFrame] error:', err.response?.data || err.message);
    return res
      .status(err.response?.status || 500)
      .json({ error: err.response?.data?.detail || err.message });
  }
};


// Función para subir un video y enviarlo a FastAPI para análisis
exports.uploadVideo = async (req, res) => {
  try {

    const owner = req.user.id
    if (!owner) {
      return res.status(401).json({ error: 'Usuario no autenticado' })
    }
    //  ➤ Crear carpeta uploads/<owner> si no existe
    
    const { fileName, corners, display_width, display_height } = req.body;
    console.log('[uploadVideo] recibido:', fileName, corners, display_width, display_height);
    if (!fileName) {
      return res.status(400).json({ error: 'Falta fileName' });
    }

    const tempPath = path.join(__dirname, '..', 'temp', fileName);
    if (!fs.existsSync(tempPath)) {
      return res.status(404).json({ error: 'Vídeo no encontrado en temp' });
    }

    const baseUploadDir = path.join(__dirname, '../uploads');
    const userDir = path.join(baseUploadDir, owner);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    //  ➤ Definir nueva ruta definitiva y mover archivo
    const destPath = path.join(userDir, fileName);
    fs.renameSync(tempPath, destPath);
    console.log('Vídeo movido a:', destPath)


    const matchDoc = await Match.create({
      owner: owner,
      videoName: fileName,
      filePath: destPath, 
      status: 'pendiente'
    })
    const matchId = matchDoc._id.toString();
    console.log('Match guardado en Mongo con _id =', matchId);

    console.log("Procesando vídeo temporal:", fileName);
    //const filePath = req.file.path;

    console.log('req.user en uploadVideo:', req.user)

    // 4 Leer payload de esquinas y dimensiones
    console.log('[DEBUG] Payload recibido en Node:', {
      corners,
      display_width,
      display_height
    });
    if (!corners) {
      console.log('[ERROR] Faltan las esquinas (corners)');
      return res.status(400).json({ error: 'Faltan las esquinas (corners)' });
    }

    // Crear un formulario para reenviar el archivo a FastAPI
    const form = new FormData();
    //form.append('fileName', fileName);
    form.append('file_name', fileName);
    form.append('corners', JSON.stringify(corners));
    form.append('display_width', String(display_width));
    form.append('display_height', String(display_height));
    console.log('[DEBUG] FormData preparada para FastAPI');
    console.log('[DEBUG] FormData preparada para FastAPI con campos:');
    console.log('  corners =', corners);
    console.log('  display_width =', display_width);
    console.log('  display_height =', display_height);

    // Cambiamos el estado del partido a 'analizando'
    matchDoc.status = 'analizando';
    await matchDoc.save();
    
    // Realizamos la petición POST a FastAPI
    const response = await axios.post(`${FLASK_FastAPI}/upload_video`, form, {
      headers: form.getHeaders()
    });

    // 4) Guardas el análisis en InfluxDB
    const data = response.data;
    console.log("Guardando datos de análisis en InfluxDB...");
    const points = await saveAnalysisToInflux(data, matchId);
    console.log("Datos guardados en InfluxDB. Puntos escritos:", points);

    await waitForInfluxData(matchId, points);

    // Obtener estadísticas del partido
    console.log("Solicitando estadísticas a FastAPI...");
    //const statsResponse = await axios.get(`${FLASK_FastAPI}/match_stats/${matchId}`);



    const distances = await getAllDistances(matchId);
    const avgSpeeds = await getAllSpeeds(matchId);
    const maxSpeeds = await getMaxSpeed(matchId);



    console.log("Estadísticas recibidas correctamente.");



    // Guardar estadísticas en MongoDB y cambiar el estado del partido
    console.log("Guardando estadísticas en el documento Match de MongoDB...");

    // 2) Empaqueta todo en un solo objeto
    const analysis = {
      distances,
      avgSpeeds,
      maxSpeeds,
    };
    matchDoc.analysis = analysis;
    matchDoc.status   = 'analizado';
    await matchDoc.save();
    console.log("Estadísticas guardadas en MongoDB:", analysis);

    

    // 5) Devuelves matchId + análisis al cliente
    return res.json({ matchId, data });
    
    // Una vez obtenida la respuesta, eliminamos el archivo temporal
    //fs.unlink(filePath, (err) => {
    //  if (err) console.error('Error al eliminar el archivo temporal:', err);
    //});
    
    // Devolvemos la respuesta recibida de FastAPI al cliente
    //return res.json({matchId:matchDoc._id.toString(), analysis: response.data});
  } catch (error) {
      console.error('*** Error en uploadVideo ***')
      console.error('Mensaje:', error.message)
      console.error('Stack:', error.stack)
      if (error.response) {
        console.error('FastAPI devolvió:', error.response.status, error.response.data)
      }
      return res.status(error.response?.status || 500).json({
        error: error.response?.data || error.message
      })
    
  }
};


async function saveAnalysisToInflux(data, matchId) {
  const client   = new InfluxDB({ url: influxUrl, token: influxToken });
  const writeApi = client.getWriteApi(influxOrg, influxBucket, 'ms');

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


async function waitForInfluxData(matchId, expectedPoints, maxRetries = 1000, delay = 500) {
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


async function getAllDistances(matchId) {
  const queryApi = new InfluxDB({ url: influxUrl, token: influxToken }).getQueryApi(influxOrg);

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
      |> map(fn: (r) => ({ player_id: r.player_id, _value: math.hypot(p: r.x, q: r.y) }))
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
          r.partido_id   == "${matchId}" and
          r.entity       == "ball"
      )
      |> filter(fn: (r) => r._field == "x" or r._field == "y")
      |> pivot(
          rowKey:      ["_time"],
          columnKey:   ["_field"],
          valueColumn: "_value"
        )
      |> sort(columns: ["_time"])
      |> difference(columns: ["x", "y"])
      |> map(fn: (r) => ({ _value: math.hypot(p: r.x, q: r.y) }))
      |> sum(column: "_value")
      |> keep(columns: ["_value"])
    `

  const playerRows = await queryApi.collectRows(fluxPlayers)
  const distances = {}
  for (const row of playerRows) {
    distances[row.player_id] = parseFloat(row._value)
  }

  const ballRows = await queryApi.collectRows(fluxBall)
  let distancesBall
  if (ballRows.length > 0) {
    distancesBall = parseFloat(ballRows[0]._value)
  }
  else {
    distancesBall = 0.0 
  }

  const result = {
    players: distances,
    ball:    distancesBall
  }

  //console.log(`Distancias recorridas en el partido ${matchId}:`, distances)
  
  return result
  
}


async function getAllSpeeds(matchId) {
  const queryApi = new InfluxDB({ url: influxUrl, token: influxToken })
    .getQueryApi(influxOrg);

  const fluxPlayers = `
    import "math"

    data = from(bucket: "${influxBucket}")
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
      |> group(columns: ["player_id"])

    speedPerPlayer = data
      |> reduce(
          identity: { index: 0, prevTime: uint(v:0), prevX:0.0, prevY:0.0, totalDistance:0.0, totalTime:0.0 },
          fn: (r, accumulator) => {
            currentTime = uint(v: r._time)
            distanceDelta = if accumulator.index == 0 then 0.0 else math.hypot(p: r.x - accumulator.prevX, q: r.y - accumulator.prevY)
            timeDelta = if accumulator.index == 0 then 0.0 else float(v: currentTime - accumulator.prevTime) / 1000000000.0

            return {
              index: accumulator.index + 1,
              prevTime: currentTime,
              prevX: r.x,
              prevY: r.y,
              totalDistance: accumulator.totalDistance + distanceDelta,
              totalTime: accumulator.totalTime + timeDelta
            }
          }
        )
      |> map(fn: (r) => ({ player_id: r.player_id, _value: if r.totalTime > 0.0 then r.totalDistance / r.totalTime else 0.0 }))
      |> keep(columns: ["player_id", "_value"])
      |> yield(name: "speedPerPlayer")
  `;

  const fluxBall = `
  import "math"

  data = from(bucket: "${influxBucket}")
    |> range(start: 0)
    |> filter(fn: (r) =>
        r._measurement == "partidos" and
        r.partido_id   == "${matchId}" and
        r.entity       == "ball"
    )
    |> filter(fn: (r) => r._field == "x" or r._field == "y")
    |> pivot(
        rowKey:      ["_time"],
        columnKey:   ["_field"],
        valueColumn: "_value"
      )
    |> sort(columns: ["_time"])

  speedBall = data
    |> reduce(
        identity: { index: 0, prevTime: uint(v:0), prevX:0.0, prevY:0.0, totalDistance:0.0, totalTime:0.0 },
        fn: (r, accumulator) => {
          currentTime = uint(v: r._time)
          distanceDelta = if accumulator.index == 0 then 0.0 else math.hypot(p: r.x - accumulator.prevX, q: r.y - accumulator.prevY)
          timeDelta = if accumulator.index == 0 then 0.0 else float(v: currentTime - accumulator.prevTime) / 1000000000.0

          return {
            index: accumulator.index + 1,
            prevTime: currentTime,
            prevX: r.x,
            prevY: r.y,
            totalDistance: accumulator.totalDistance + distanceDelta,
            totalTime: accumulator.totalTime + timeDelta
          }
        }
      )
    |> map(fn: (r) => ({ _value: if r.totalTime > 0.0 then r.totalDistance / r.totalTime else 0.0 }))
    |> keep(columns: ["_value"])
    |> yield(name: "speedBall")
  `;

  const playerRows = await queryApi.collectRows(fluxPlayers);
  const speeds = {};
  for (const row of playerRows) {
    speeds[row.player_id] = parseFloat(row._value);
  }

  const ballRows = await queryApi.collectRows(fluxBall)
  const ballSpeed = ballRows.length
    ? parseFloat(ballRows[0]._value)
    : 0

  const result = {
    players: speeds,
    ball:    ballSpeed
  }

  //console.log(`Velocidades media ${matchId}:`, result)
  return result;
}

async function getMaxSpeed(matchId) {
  const queryApi = new InfluxDB({ url: influxUrl, token: influxToken })
    .getQueryApi(influxOrg)


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
           v:      if r.elapsed > 0.0 then math.hypot(p: r.x, q: r.y) / (float(v: r.elapsed) / 1000.0) else 0.0
      }))
      |> map(fn: (r) => ({
           _time:  r._time,
           _value: if r.v <= 35.0 then r.v else 35.0
      }))

    avg1s = speed20ms
      |> window(every: 1s)
      |> mean(column: "_value")
      |> keep(columns: ["_start", "_value"])

    maxAvg1s = avg1s
      |> max(column: "_value")
      |> keep(columns: ["_value"])
      |> yield(name: "max_avg_1s_speed_ball")
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
    players: maxSpeedsPlayers,
    ball:    maxSpeedBall
  }

  //console.log(`Velocidades máximas medias por segundo en el partido ${matchId}:`, result)
  return result
}