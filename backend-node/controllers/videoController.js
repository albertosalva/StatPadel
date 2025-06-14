// controllers/videoController.js

const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
const fs = require('fs');
const Match = require('../models/Match');

const { saveAnalysisToInflux, waitForInfluxData, getPlayersDistanceAndAvgSpeed, getMaxSpeed, getHeatmapData} = require('./influxController');

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

//PONER LOS JUGADORES CAMBIAR A QUE SE SAQUEN DEL FRONT
    const playerPositions = {
      'bottom_left': null,
      'bottom_right': '681116daa4cf53837b002260',  // ID del usuario 1
      'top_left': '682cd14ca694c304b2789940',     // ID del usuario 2
      'top_right': null
    };

    const matchDoc = await Match.create({
      owner: owner,
      videoName: fileName,
      filePath: destPath, 
      status: 'pendiente',
      playerPositions: playerPositions
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
    //const points = await saveAnalysisToInflux(data, matchId);
    console.log("Datos guardados en InfluxDB. Puntos escritos:", points);

    await waitForInfluxData(matchId, points);

    // Obtener estadísticas del partido
    //const statsResponse = await axios.get(`${FLASK_FastAPI}/match_stats/${matchId}`);


    const { distances, avgSpeeds } = await getPlayersDistanceAndAvgSpeed(matchId);
    const maxSpeeds = await getMaxSpeed(matchId);
    console.log("Estadísticas recibidas correctamente.");

    console.log("Sacar los datos para un mapa de calor...");
    const heatmapData = await getHeatmapData(matchId);

    //console.log("Datos para el mapa de calor obtenidos:", heatmapData);

    // Guardar estadísticas en MongoDB y cambiar el estado del partido
    console.log("Guardando estadísticas en el documento Match de MongoDB...");

    // 2) Empaqueta todo en un solo objeto
    const analysis = {
      distances,
      avgSpeeds,
      maxSpeeds
    };
    
    matchDoc.analysis = analysis;
    matchDoc.heatmap = heatmapData;
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

