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
    console.log('aaaaa Match guardado en Mongo con _id =', matchId);

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
    const analysis = response.data;
    console.log("Guardando datos de análisis en InfluxDB...");
    const points = await saveAnalysisToInflux(analysis, matchId);
    console.log("Datos guardados en InfluxDB. Puntos escritos:", points);

    await waitForInfluxData(matchId, points);

    // Obtener estadísticas del partido
    console.log("Solicitando estadísticas a FastAPI...");
    //const statsResponse = await axios.get(`${FLASK_FastAPI}/match_stats/${matchId}`);
    const stats = await computeMatchStats(matchId);
    console.log("Estadísticas recibidas correctamente.");

    //const statistics = statsResponse.data;
    // 💬 Mostrar las estadísticas en consola
    console.log("Estadísticas a guardar en MongoDB:");
    console.log(JSON.stringify(stats, null, 2));  // Pretty print

    // Guardar estadísticas en MongoDB y cambiar el estado del partido
    console.log("Guardando estadísticas en el documento Match de MongoDB...");
    //matchDoc.analysis = statistics;
    matchDoc.analysis = stats;
    matchDoc.status = 'analizado';
    await matchDoc.save();
    console.log("Estadísticas guardadas en MongoDB.");

    

    // 5) Devuelves matchId + análisis al cliente
    return res.json({ matchId, analysis });
    
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


async function saveAnalysisToInflux(transformedJson, matchId) {
  const client   = new InfluxDB({ url: influxUrl, token: influxToken });
  const writeApi = client.getWriteApi(influxOrg, influxBucket, 'ms');

  console.log(`🔍 [Influx] Iniciando escritura para match ${matchId}`);
  const frameIntervalMs = 40;
  const startTime = Date.now();
  let totalPoints = 0;

  try {
    for (let i = 0; i < transformedJson.frames.length; i++) {
      const frame     = transformedJson.frames[i];
      const timestamp = new Date(startTime + i * frameIntervalMs);
      console.log(`  ↳ Frame ${i + 1}/${transformedJson.frames.length} @ ${timestamp.toISOString()}`);

      // Jugadores
      let playersWritten = 0;
      for (const [playerId, coords] of Object.entries(frame.players)) {
        if (coords.x !== -1 && coords.y !== -1) {
          writeApi.writePoint(
            new Point('partidos')
              .tag('partido_id', matchId)
              .tag('entity', 'player')
              .tag('player_id', playerId)
              .floatField('x', coords.x)
              .floatField('y', coords.y)
              .timestamp(timestamp)
          );
          playersWritten++;
          totalPoints++;
        }
      }
      console.log(`     • Jugadores escritos: ${playersWritten}`);

      // Bola
      let ballWritten = 0;
      const ball = frame.ball;
      if (ball.x !== -1 && ball.y !== -1) {
        writeApi.writePoint(
          new Point('partidos')
            .tag('partido_id', matchId)
            .tag('entity', 'ball')
            .floatField('x', ball.x)
            .floatField('y', ball.y)
            .timestamp(timestamp)
        );
        ballWritten++;
        totalPoints++;
      }
      console.log(`     • Bola escrita: ${ballWritten}`);
    }

    console.log(`🔄 Forzando flush sincrónico...`);
    await writeApi.flush();
    console.log(`✅ Flush completado`);

    console.log(`🔄 Cerrando writeApi y enviando ${totalPoints} puntos a InfluxDB…`);
    await writeApi.close();
    console.log(`✅ Todos los puntos de match ${matchId} guardados correctamente en InfluxDB.`);

    return totalPoints;
  } catch (err) {
    console.error(`❌ Error al escribir en InfluxDB para match ${matchId}:`, err);
  }
}

async function waitForInfluxData(matchId, expectedPoints, maxRetries = 1000, delay = 500) {
  console.log(`⌛ Esperando datos para ${matchId} (${expectedPoints} puntos)`);
  
  for (let i = 0; i < maxRetries; i++) {
    const flux = `from(bucket:"${influxBucket}")
      |> range(start: -5m)
      |> filter(fn: (r) => 
          r._measurement == "partidos" and 
          r.partido_id == "${matchId}"
      )
      |> group(columns: ["_field"])
      |> count()
      |> sum()`;
    
    try {
      const result = await queryApi.collectRows(flux);
      const totalRecords = result.length > 0 ? result[0]._value : 0;
      
      console.log(`↩️ Intento ${i+1}/${maxRetries}: ${totalRecords} registros`);
      
      // Verificación más precisa
      if (totalRecords >= expectedPoints) {
        console.log(`✅ Datos disponibles (${totalRecords} registros)`);
        return;
      }
    } catch (err) {
      console.error(`⚠️ Error en consulta: ${err.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(`Timeout: Solo se encontraron ${totalRecords}/${expectedPoints*2} registros`);
}


async function computeMatchStats(matchId) {
  // Consulta para jugadores
  const fluxPlayers = `
    from(bucket:"${influxBucket}")
      |> range(start: 0)
      |> filter(fn: (r) =>
          r._measurement == "partidos" and
          r.partido_id     == "${matchId}" and
          r.entity         == "player" and
          (r._field == "x" or r._field == "y")
      )
      |> pivot(
          rowKey:    ["_time","player_id"],
          columnKey: ["_field"],
          valueColumn: "_value"
      )
      |> keep(columns: ["_time","player_id","x","y"])
      |> sort(columns: ["_time"])
    `;
  const playerRows = await queryApi.collectRows(fluxPlayers);

  // Consulta para la bola
  const fluxBall = `
    from(bucket:"${influxBucket}")
      |> range(start: 0)
      |> filter(fn: (r) =>
          r._measurement == "partidos" and
          r.partido_id     == "${matchId}" and
          r.entity         == "ball" and
          (r._field == "x" or r._field == "y")
      )
      |> pivot(
          rowKey:    ["_time"],
          columnKey: ["_field"],
          valueColumn: "_value"
      )
      |> keep(columns: ["_time","x","y"])
      |> sort(columns: ["_time"])
    `;
  const ballRows = await queryApi.collectRows(fluxBall);

  // si no hay datos
  if (!playerRows.length && !ballRows.length) {
    throw new Error(`No hay datos para matchId=${matchId}`);
  }

  // Helper de estadísticas de trayectoria
  function trajectoryStats(pts) {
    let totalDist = 0, totalTime = 0, maxSpeed = 0;
    for (let i = 1; i < pts.length; i++) {
      const dt   = (pts[i].time - pts[i-1].time) / 1000;
      if (dt <= 0) continue;
      const dx   = pts[i].x - pts[i-1].x;
      const dy   = pts[i].y - pts[i-1].y;
      const dist = Math.hypot(dx, dy);
      const sp   = dist / dt;
      totalDist += dist;
      totalTime += dt;
      if (sp > maxSpeed) maxSpeed = sp;
    }
    return {
      total_distance:  parseFloat(totalDist.toFixed(3)),
      average_speed:   parseFloat((totalTime>0 ? totalDist/totalTime : 0).toFixed(3)),
      max_speed:       parseFloat(maxSpeed.toFixed(3)),
      n_points:        pts.length
    };
  }

  // Procesar jugadores
  const statsPlayers = {};
  const grouped = playerRows.reduce((acc, r) => {
    const pid = r.player_id;
    acc[pid] = acc[pid] || [];
    acc[pid].push({
      time: new Date(r._time),
      x:    r.x,
      y:    r.y
    });
    return acc;
  }, {});
  for (const [pid, pts] of Object.entries(grouped)) {
    pts.sort((a,b) => a.time - b.time);
    statsPlayers[pid] = trajectoryStats(pts);
  }

  // Procesar bola
  const ballPts = ballRows.map(r => ({
    time: new Date(r._time),
    x:    r.x,
    y:    r.y
  })).sort((a,b) => a.time - b.time);
  const statsBall = ballPts.length
    ? trajectoryStats(ballPts)
    : { total_distance:0, average_speed:0, max_speed:0, n_points:0 };

  // Calcular start/end/duration
  const allTimes = [
    ...playerRows.map(r => new Date(r._time).getTime()),
    ...ballRows  .map(r => new Date(r._time).getTime())
  ].sort((a,b) => a - b);
  const t0 = new Date(allTimes[0]);
  const t1 = new Date(allTimes[allTimes.length - 1]);
  const duration_s = parseFloat(((t1 - t0)/1000).toFixed(3));

  // Formateo tipo "YYYY-MM-DD HH:mm:ss.SSS+00:00"
  const fmt = dt => dt.toISOString()
    .replace('T',' ')
    .replace('Z','+00:00');

  // Devuelve SOLO el objeto analysis
  return {
    match_id:   matchId,
    start_time: fmt(t0),
    end_time:   fmt(t1),
    duration_s,
    players:    statsPlayers,
    ball:       statsBall
  };
}