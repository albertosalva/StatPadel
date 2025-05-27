// controllers/videoController.js

const axios = require('axios');
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

// Función para subir un video temporalmente (sin análisis) y reenviarlo a FastAPI
exports.uploadVideoTemp = async (req, res) => {
  try {
    console.log("Archivo recibido en Node (uploadVideoTemp):", req.file);
    const filePath = req.file.path;
    
    // Crear un objeto FormData y adjuntar el archivo usando un stream
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), req.file.originalname);
    
    // Reenviar la petición a FastAPI (asegúrate de que la URL y puerto sean correctos)
    const response = await axios.post(`${FLASK_FastAPI}/upload_video_temp`, form, {
      headers: form.getHeaders()
    });
    
    // Una vez reenviado, elimina el archivo temporal de Node (si lo deseas)
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error al eliminar el archivo temporal:', err);
    });
    
    // Retorna la respuesta que envía FastAPI
    res.json(response.data);
  } catch (error) {
    console.error("Error en uploadVideoTemp:", error.message);
    res.status(error.response ? error.response.status : 500).json({ error: error.response ? error.response.data : "Error al subir el archivo" });
  }
};

// Función para subir un video y enviarlo a FastAPI para análisis
exports.uploadVideo = async (req, res) => {
  try {
    // La ruta del archivo subido (gestionado por multer)
    const fs   = require('fs');
    const path = require('path');

    const owner = req.user.id
    if (!owner) {
      return res.status(401).json({ error: 'Usuario no autenticado' })
    }

    //  ➤ Crear carpeta uploads/<owner> si no existe
    const baseUploadDir = path.join(__dirname, '../uploads');
    const userDir = path.join(baseUploadDir, owner);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    //  ➤ Definir nueva ruta definitiva y mover archivo
    const destPath = path.join(userDir, req.file.originalname);
    fs.renameSync(req.file.path, destPath);
    console.log('Vídeo movido a:', destPath)

    const matchDoc = await Match.create({
      owner: owner,
      videoName: req.file.originalname,
      filePath: destPath
    })
    const matchId = matchDoc._id.toString();
    console.log('aaaaa Match guardado en Mongo con _id =', matchId);

    console.log("Archivo recibido:", req.file);
    //const filePath = req.file.path;

    console.log('req.user en uploadVideo:', req.user)

    
    // Crear un formulario para reenviar el archivo a FastAPI
    const form = new FormData();
    form.append('file', fs.createReadStream(destPath), req.file.originalname);
    
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