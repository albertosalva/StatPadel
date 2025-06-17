// controllers/videoController.js

const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
const fs = require('fs');
const Match = require('../models/Match');
const User = require('../models/Users');

const { saveAnalysisToInflux, waitForInfluxData, getPlayersDistanceAndAvgSpeed, getMaxSpeed, getHeatmapData} = require('./influxController');

const host = process.env.API_HOST;
const port = process.env.API_PORT_VIDEO;
const FLASK_FastAPI = `http://${host}:${port}`;



//Guardar vídeo en temp/
exports.uploadVideoTemp = async (req, res) => {
  try {
    //console.log('[uploadVideoTemp] recibido:', req.file.originalname);
    // Multer ya guardó en temp/, devolvemos el nombre
    //res.json({ fileName: req.file.originalname });
    const fileName = req.file.filename;
    //console.log('Nombre del fichero cambiado:', req.file.filename)
    return res.status(200).json({ fileName });
  }
  catch (err) {
    console.error('❌ Error en uploadVideoTemp:', err);
    return res.status(500).json({ error: err.message });
  }
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

    console.log('---> Payload recibido en backend:', req.body);
    const {
      fileName,
      matchName,
      matchDate,
      matchLocation,
      corners,
      display_width,
      display_height,
      players_positions
    } = req.body;
    //console.log(fileName, matchName, matchDate, matchLocation, corners, display_width, display_height, players_positions);

    //console.log('Jugadores recibidos:', players_positions);
    if (!fileName) {
      return res.status(400).json({ error: 'Falta fileName' });
    }

    cornersSorted = ordenarEsquinas(corners);

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

    const asignados = await clasificarJugadores(players_positions );
    console.log('--------> Posiciones asignadas:', asignados);


    const matchDoc = await Match.create({
      owner: owner,
      matchName: matchName,
      matchDate: matchDate,
      matchLocation: matchLocation,
      videoName: fileName,
      filePath: destPath, 
      status: 'pendiente',
      playerPositions: asignados
    })
    const matchId = matchDoc._id.toString();
    //console.log('Match guardado en Mongo con _id =', matchId);

    //console.log("Procesando vídeo temporal:", fileName);
    //const filePath = req.file.path;

    // 4 Leer payload de esquinas y dimensiones
    console.log('[DEBUG] Payload recibido en Node:', {
      cornersSorted,
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
    form.append('corners', JSON.stringify(cornersSorted));
    form.append('display_width', String(display_width));
    form.append('display_height', String(display_height));


    // Cambiamos el estado del partido a 'analizando'
    matchDoc.status = 'analizando';
    await matchDoc.save();
    
    // Realizamos la petición POST a FastAPI
    const response = await axios.post(`${FLASK_FastAPI}/upload_video`, form, {
      headers: form.getHeaders()
    });

    // 4) Guardas el análisis en InfluxDB
    const data = response.data;
    const points = await saveAnalysisToInflux(data, matchId);
    //const points = await saveAnalysisToInflux(data, matchId);
    //console.log("Datos guardados en InfluxDB. Puntos escritos:", points);

    await waitForInfluxData(matchId, points);

    // Obtener estadísticas del partido
    //const statsResponse = await axios.get(`${FLASK_FastAPI}/match_stats/${matchId}`);


    const { distances, avgSpeeds } = await getPlayersDistanceAndAvgSpeed(matchId);
    const maxSpeeds = await getMaxSpeed(matchId);
    //console.log("Estadísticas recibidas correctamente.");

    const heatmapData = await getHeatmapData(matchId);

    //console.log("Datos para el mapa de calor obtenidos:", heatmapData);

    // Guardar estadísticas en MongoDB y cambiar el estado del partido
    //console.log("Guardando estadísticas en el documento Match de MongoDB...");

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


async function clasificarJugadores(players_positions = []) {

  // 1) Inicializamos el resultado con nulls
  const result = {
    top_left:     null,
    top_right:    null,
    bottom_right: null,
    bottom_left:  null
  }

  // 2) Si no hay ningún punto, devolvemos nulls instantly
  if (!Array.isArray(players_positions) || players_positions.length === 0) {
    return result
  }

  // 3) Calculamos métricas para cada punto
  const puntos = players_positions.map(p => {
    const sum  = p.x + p.y
    const diff = p.x - p.y
    return { ...p, sum, diff }
  })

  // 4) Extraemos usernames únicos para consulta
  const usernames = Array.from(new Set(puntos.map(p => p.username).filter(Boolean)))

  // 5) Traemos todos los usuarios de golpe
  const users = await User.find({ username: { $in: usernames } }).select('_id username')
  const userMap = new Map(users.map(u => [u.username, u._id]))

  // 6) Asignamos a cada esquina el candidato más extremo
  const tl = puntos.reduce((a, b) => a.sum  < b.sum  ? a : b)
  const br = puntos.reduce((a, b) => a.sum  > b.sum  ? a : b)
  const bl = puntos.reduce((a, b) => a.diff < b.diff ? a : b)
  const tr = puntos.reduce((a, b) => a.diff > b.diff ? a : b)

  // 7) Para cada uno, si tiene username, pedimos su ObjectId; si no, queda null
  result.top_left     = userMap.get(tl.username) || null
  result.top_right    = userMap.get(tr.username) || null
  result.bottom_right = userMap.get(br.username) || null
  result.bottom_left  = userMap.get(bl.username) || null

  return result
}

function ordenarEsquinas(corners) {
  if (!Array.isArray(corners) || corners.length !== 4) {
    throw new Error("Se esperaban exactamente 4 esquinas");
  }

  const sorted = [...corners];

  const topLeft = sorted.reduce((a, b) => a[0] + a[1] < b[0] + b[1] ? a : b);
  const bottomLeft = sorted.reduce((a, b) => a[0] - a[1] < b[0] - b[1] ? a : b);
  const bottomRight = sorted.reduce((a, b) => a[0] + a[1] > b[0] + b[1] ? a : b);
  const topRight = sorted.reduce((a, b) => a[0] - a[1] > b[0] - b[1] ? a : b);

  return [topLeft, topRight, bottomRight, bottomLeft];
}