// routes/videoRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const videoController = require('../controllers/videoController');

// Configuración de Multer para almacenar el archivo subido en una carpeta "temp"
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'temp'));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });


// Endpoint para subir el video temporalmente (sin análisis)
router.post('/upload_video_temp', upload.single('file'), videoController.uploadVideoTemp);

// Endpoint para subir el video y enviarlo a FastAPI para análisis
router.post('/upload_video', upload.single('file'), videoController.uploadVideo);

module.exports = router;
