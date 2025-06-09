// routes/videoRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const videoController = require('../controllers/videoController');
const { checkAuth } = require('../middleware/auth')

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


// Endpoint para subir el video temporalmente (sin análisis)
router.post('/upload_video_temp', checkAuth, upload.single('file'), videoController.uploadVideoTemp);

router.post('/load_frame', checkAuth, express.json(), videoController.loadFrame);

// Endpoint para subir el video y enviarlo a FastAPI para análisis
router.post('/upload_video', checkAuth, express.json(), videoController.uploadVideo);



module.exports = router;
