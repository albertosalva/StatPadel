// controllers/videoController.js

const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
const fs = require('fs');
const { use } = require('../routes/authRoutes');
const Match = require('../models/Match');

const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const influxUrl = process.env.INFLUX_URL;   
const influxToken = process.env.INFLUX_TOKEN;
const influxOrg = process.env.INFLUX_ORG;
const influxBucket = process.env.INFLUX_BUCKET;

const host = process.env.API_HOST;
const port = process.env.API_PORT_VIDEO;
const FLASK_FastAPI = `http://${host}:${port}`;


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
      filePath: destPath
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

    
    // Realizamos la petición POST a FastAPI
    const response = await axios.post(`${FLASK_FastAPI}/upload_video`, form, {
      headers: form.getHeaders()
    });

    // 4) Guardas el análisis en InfluxDB
    const analysis = response.data;
    console.log("Guardando datos de análisis en InfluxDB...");
    await saveAnalysisToInflux(analysis, matchId);
    console.log("Datos guardados en InfluxDB.");

    // CAMBIAR ESTOOOOOOO
    await delay(10000);



    // Obtener estadísticas del partido
    console.log("Solicitando estadísticas a FastAPI...");
    const statsResponse = await axios.get(`${FLASK_FastAPI}/match_stats/${matchId}`);
    console.log("Estadísticas recibidas correctamente.");

    const statistics = statsResponse.data;
    // 💬 Mostrar las estadísticas en consola
    console.log("Estadísticas a guardar en MongoDB:");
    console.log(JSON.stringify(statistics, null, 2));  // Pretty print

    // Guardar estadísticas en MongoDB
    console.log("Guardando estadísticas en el documento Match de MongoDB...");
    matchDoc.analysis = statistics;
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

//CAMBIAR ESTA FORMA DE ESPERAR A QUE SE GUARDEN LOS DATOS EN INFLUXDB
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


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

    console.log(`🔄 Cerrando writeApi y enviando ${totalPoints} puntos a InfluxDB…`);
    await writeApi.close();
    console.log(`✅ Todos los puntos de match ${matchId} guardados correctamente en InfluxDB.`);
  } catch (err) {
    console.error(`❌ Error al escribir en InfluxDB para match ${matchId}:`, err);
  }
}