// routes/videoRoutes.js


/**
 * @module routes/videoRoutes
 * @description
 * Rutas para subir, procesar y recuperar resultados de vídeos:
 * <ul>
 *   <li><code>POST /upload_video_temp</code>: sube un vídeo al servidor (sin análisis).</li>
 *   <li><code>POST /load_frame</code>: solicita un frame específico de un vídeo.</li>
 *   <li><code>POST /upload_video</code>: sube un vídeo y lo envía a FastAPI para análisis.</li>
 *   <li><code>POST /video_result</code>: recibe los datos resultantes del análisis.</li>
 * </ul>
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const videoController = require('../controllers/videoController');
const { checkAuth } = require('../middleware/auth');
const bodyParser    = require('body-parser');

// Configuración de Multer para almacenar el archivo subido en una carpeta "temp"
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'temp'));
  },
  filename: function (req, file, cb) {
    // Asume que req.user.id está disponible (gracias a checkAuth)
    const userId = req.user.id;
    const ts     = Date.now();
    const safeName = file.originalname.replace(/[^\w\-.]/g, '_');
    const uniqueName = `${userId}-${ts}-${safeName}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage: storage });



/**
 * Sube un vídeo temporalmente (sin análisis).
 *
 * @name uploadVideoTemp
 * @route POST /upload_video_temp
 * @param   {express.Request}  req    Petición con `req.file` (Multer).
 * @param   {express.Response} res    Respuesta con `{ fileName }`.
 * @returns {void}
 * @throws  {Error}            Si falla la subida del archivo.
 */
router.post('/upload_video_temp', checkAuth, upload.single('file'), videoController.uploadVideoTemp);


/**
 * Extrae el primer frame de un vídeo subido.
 *
 * @name loadFrame
 * @route POST /load_frame
 * @param   {express.Request}  req  Petición con `{ fileName }` en `req.body`.
 * @param   {express.Response} res  Respuesta con `{ frame }` en Base64.
 * @returns {void}
 * @throws  {Error}            Si falta `fileName`, no existe el vídeo o falla ffmpeg.
 */
router.post('/load_frame', checkAuth, express.json(), videoController.loadFrame);



/**
 * Sube un vídeo y lo envía a FastAPI para análisis.
 *
 * @name uploadVideo
 * @route POST /upload_video
 * @param   {express.Request}  req  Petición con JSON en `req.body` y `req.file`.
 * @param   {express.Response} res  Respuesta con `{ matchId }`.
 * @returns {void}
 * @throws  {Error}            Si faltan datos, el fichero no existe o FastAPI falla.
 */
router.post('/upload_video', checkAuth, express.json(), videoController.uploadVideo);


/**
 * Recibe los datos resultantes del análisis de vídeo.
 *
 * @name handleVideoResult
 * @route POST /video_result
 * @param   {express.Request}  req  Petición con `{ matchId, result }` en `req.body`.
 * @param   {express.Response} res  Respuesta `{ ok: true }` para confirmar recepción.
 * @returns {void}
 */
router.post('/video_result', express.json(), videoController.handleVideoResult);

module.exports = router;
