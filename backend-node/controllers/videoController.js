// controllers/videoController.js

/**
 * @module controllers/videoController
 * @description
 * Controlador para la gestión de vídeo:
 * <ul>
 *   <li><code>uploadVideoTemp</code>: guarda temporalmente un vídeo subido.</li>
 *   <li><code>loadFrame</code>: extrae el primer frame de un vídeo.</li>
 *   <li><code>uploadVideo</code>: mueve el vídeo a su destino, crea el documento Match y lo envía a FastAPI.</li>
 *   <li><code>handleVideoResult</code>: procesa el resultado del análisis, guarda estadísticas en Mongo e Influx.</li>
 *   <li><code>clasificarJugadores</code>: asigna usuarios a esquinas basado en sus posiciones.</li>
 *   <li><code>ordenarEsquinas</code>: ordena un array de 4 esquinas en sentido top-left → top-right → bottom-right → bottom-left.</li>
 * </ul>
 */

const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
const fs = require('fs');
const Match = require('../models/Match');
const User = require('../models/Users');

const ffmpeg  = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

// Aseguramos que ffmpeg usa el binario instalado
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const { saveAnalysisToInflux, waitForInfluxData, getPlayersDistanceAndAvgSpeed, getMaxSpeed, getHeatmapData} = require('../services/influxServices');

const host = process.env.VIDEO_API_HOST;
const port = process.env.VIDEO_API_PORT;
const FLASK_FastAPI = `http://${host}:${port}`;



/**
 * Guarda temporalmente un vídeo subido y devuelve su nombre de archivo.
 *
 * @async
 * @function uploadVideoTemp
 * @param   {express.Request}  req      Petición con `req.file` (Multer).
 * @param   {express.Response} res      Respuesta con `{ fileName }`.
 * @returns {Promise<express.Response>} Código 200 y nombre del fichero.
 * @throws  {Error}                     Si ocurre un fallo inesperado.
 */
exports.uploadVideoTemp = async (req, res) => {
  try {
    // Multer ya guardó en temp/, devolvemos el nombre
    const fileName = req.file.filename;

    return res.status(200).json({ fileName });
  }
  catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


/**
 * Extrae el primer frame de un vídeo ya subido.
 *
 * @async
 * @function loadFrame
 * @param   {express.Request}  req      Petición con `{ fileName }` en el body.
 * @param   {express.Response} res      Respuesta con `{ frame }` Base64.
 * @returns {Promise<express.Response>} Código 200 y frame en Base64.
 * @throws  {Error}                     Si falta `fileName`, no existe el vídeo o ffmpeg falla.
 */
exports.loadFrame = async (req, res) => {
  const { fileName } = req.body;
  if (!fileName) {
    return res.status(400).json({ error: 'Falta fileName en el body' });
  }

  // Leer de la carpeta temp
  const filePath = path.join(__dirname, '..', 'temp', fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Vídeo no encontrado en temp' });
  }

  try {
    // Leemos el primer frame y lo capturamos en memoria
    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      const pass   = new PassThrough();

      // Configuramos ffmpeg para sólo un frame
      ffmpeg(filePath)
        .outputOptions(['-vframes 1'])
        .format('image2')
        .on('error', err => reject(err))
        .on('end', () => resolve(Buffer.concat(chunks)))
        .pipe(pass, { end: true });

      pass.on('data', chunk => chunks.push(chunk));
      pass.on('error', err => reject(err));
    });

    // Convertimos a Base64
    const b64 = buffer.toString('base64');

    // Devolvemos el frame
    //console.log('[loadFrame] Frame extraído correctamente', {frame: b64});
    return res.json({ frame: b64 });
  } catch (err) {
    //console.error('[loadFrame] Error extrayendo frame:', err);
    return res.status(500).json({ error: 'No se pudo extraer el primer frame' });
  }

};


/**
 * Mueve el vídeo a la carpeta definitiva, crea el documento de Match y lo envía a FastAPI.
 *
 * @async
 * @function uploadVideo
 * @param   {express.Request}  req      Petición con JSON en body y `req.file`.
 * @param   {express.Response} res      Respuesta con `{ matchId }`.
 * @returns {Promise<express.Response>} Código 200 y ID del nuevo partido.
 * @throws  {Error}                     Si faltan datos, el fichero no existe o FastAPI falla.
 */
exports.uploadVideo = async (req, res) => {
  try {

    const owner = req.user.id
    if (!owner) {
      return res.status(401).json({ error: 'Usuario no autenticado' })
    }

    console.log('---> Payload recibido en backend:', req.body);
    const { fileName, matchName, matchDate, matchLocation,corners,
      display_width, display_height, players_positions} = req.body;
    //console.log(fileName, matchName, matchDate, matchLocation, corners, display_width, display_height, players_positions);

    //console.log('Jugadores recibidos:', players_positions);
    if (!fileName) {
      return res.status(400).json({ error: 'Falta fileName' });
    }

    // Validar que el vídeo existe en la carpeta temporal
    const tempPath = path.join(__dirname, '..', 'temp', fileName);
    if (!fs.existsSync(tempPath)) {
      return res.status(404).json({ error: 'Vídeo no encontrado en temp' });
    }

    const baseUploadDir = path.join(__dirname, '../uploads', 'videos');
    const userDir = path.join(baseUploadDir, owner);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    // Definir nueva ruta definitiva y mover archivo
    const destPath = path.join(userDir, fileName);
    fs.renameSync(tempPath, destPath);

    const asignados = await clasificarJugadores(players_positions );
    //console.log('--------> Posiciones asignadas:', asignados);


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

    cornersSorted = ordenarEsquinas(corners);

    if (!corners) {
      //console.log('[ERROR] Faltan las esquinas (corners)');
      return res.status(400).json({ error: 'Faltan las esquinas (corners)' });
    }

    // Crear un formulario para reenviar el archivo a FastAPI
    const form = new FormData();
    //console.log('Nombre de la ruta', destPath);
    form.append('file', fs.createReadStream(destPath), fileName);
    form.append('file_name', fileName);
    form.append('corners', JSON.stringify(cornersSorted));
    form.append('display_width', String(display_width));
    form.append('display_height', String(display_height));
    form.append('match_id', matchId);

    //console.log('Enviando a FastAPI:',{matchId})

    // Cambiamos el estado del partido a 'analizando'
    matchDoc.status = 'analizando';
    await matchDoc.save();
    
    // Realizamos la petición POST a FastAPI
    await axios.post(`${FLASK_FastAPI}/upload_video`, form, {headers: form.getHeaders()});
    

    return res.json({ matchId });
    
  } catch (error) {
      console.error('*** Error en uploadVideo ***')
      //console.error('Mensaje:', error.message)
      //console.error('Stack:', error.stack)
      if (error.response) {
        console.error('FastAPI devolvió:', error.response.status, error.response.data)
      }
      return res.status(error.response?.status || 500).json({
        error: error.response?.data || error.message
      })
  }
};



/**
 * Procesa el resultado del análisis de vídeo, guarda estadísticas en Mongo e Influx.
 *
 * @async
 * @function handleVideoResult
 * @param   {express.Request}  req      Petición con `{ matchId, result }`.
 * @param   {express.Response} res      Respuesta OK para el consumidor.
 * @returns {Promise<express.Response>} Código 200 `{ ok: true }`.
 * @throws  {Error}                     Si el partido no existe o la inserción de datos falla.
 */
exports.handleVideoResult = async (req, res) => {
  
  const { matchId, result } = req.body;

  //console.log(`[Video Result] Id match ${matchId} completada.`);
  const matchDoc = await Match.findById(matchId);
  if (!matchDoc) {
    return res.status(404).json({ error: 'Match no encontrado' });
  }

  // Comprobar que estan todos los puntos guardados
  const points = await saveAnalysisToInflux(result, matchId);

  await waitForInfluxData(matchId, points);

  // Calcular estadisticas
  const { distances, avgSpeeds } = await getPlayersDistanceAndAvgSpeed(matchId);
  const maxSpeeds = await getMaxSpeed(matchId);

  // Calcular mapa de calor
  const heatmapData = await getHeatmapData(matchId);

  const analysis = {
    distances,
    avgSpeeds,
    maxSpeeds
  };
    
  matchDoc.analysis = analysis;
  matchDoc.heatmap = heatmapData;
  matchDoc.status   = 'analizado';
  await matchDoc.save();

  console.log(`[Video Result] Match ${matchId} actualizado en Mongo y listo.`);

  // Respondes OK a Celery para que no reintente
  res.json({ ok: true }); 
};


/**
 * Asigna cada posición de jugador a una esquina del campo.
 *
 * @async
 * @function clasificarJugadores
 * @param   {Array<Object>} players_positions Array de objetos `{ x, y, username }`.
 * @returns {Promise<Object>}                 Objeto con IDs de usuario en `top_left`, `top_right`, `bottom_right`, `bottom_left`.
 */
async function clasificarJugadores(players_positions = []) {

  // Inicializamos el resultado con nulls
  const result = {
    top_left:     null,
    top_right:    null,
    bottom_right: null,
    bottom_left:  null
  };

  // Si no hay ningún punto, devolvemos nulls instantly
  if (!Array.isArray(players_positions) || players_positions.length === 0) {
    return result
  }

  // Calculamos métricas para cada punto
  const puntos = players_positions.map(p => {
    const sum  = p.x + p.y
    const diff = p.x - p.y
    return { ...p, sum, diff }
  });

  // Extraemos usernames únicos para consulta
  const usernames = Array.from(new Set(puntos.map(p => p.username).filter(Boolean)));

  // Traemos todos los usuarios de golpe
  const users = await User.find({ username: { $in: usernames } }).select('_id username');
  const userMap = new Map(users.map(u => [u.username, u._id]));

  // Asignamos a cada esquina el candidato más extremo
  const tl = puntos.reduce((a, b) => a.sum  < b.sum  ? a : b)
  const br = puntos.reduce((a, b) => a.sum  > b.sum  ? a : b)
  const bl = puntos.reduce((a, b) => a.diff < b.diff ? a : b)
  const tr = puntos.reduce((a, b) => a.diff > b.diff ? a : b)

  // Para cada uno, si tiene username, pedimos su ObjectId; si no, queda null
  result.top_left = userMap.get(tl.username) || null
  result.top_right = userMap.get(tr.username) || null
  result.bottom_right = userMap.get(br.username) || null
  result.bottom_left = userMap.get(bl.username) || null

  return result
}


/**
 * Ordena un array de 4 esquinas en el orden:
 * top-left → top-right → bottom-right → bottom-left.
 *
 * @function ordenarEsquinas
 * @param   {Array<Array<number>>} corners  Array de 4 pares `[x, y]`.
 * @returns {Array<Array<number>>}          Esquinas ordenadas.
 * @throws  {Error}                         Si el array no tiene exactamente 4 elementos.
 */
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


