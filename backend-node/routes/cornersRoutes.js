// routes/cornersRoutes.js

const express = require('express');
const router = express.Router();
const cornersController = require('../controllers/cornersController');

// Endpoint para cargar el video (primer frame)
router.post('/load_video', cornersController.loadVideo);

// Endpoint para obtener el primer frame (en base64)
router.get('/get_frame', cornersController.getFrame);

// Endpoint para enviar las esquinas seleccionadas por el usuario
router.post('/set_corners', cornersController.setCorners);

// (Opcional) Endpoint para obtener las esquinas (para polling, si es necesario)
router.get('/get_corners', cornersController.getCorners);

module.exports = router;
