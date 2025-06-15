const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Ruta para iniciar sesión
router.post('/check', userController.checkUserExists);


module.exports = router;