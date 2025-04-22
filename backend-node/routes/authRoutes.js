// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta para iniciar sesión
router.post('/login', authController.login);

// Ruta para registrar un nuevo usuario
router.post('/register', authController.register);

// Ruta para verificar el token JWT 
router.get('/protected', authController.verifyToken, (req, res) => {
  res.json({ message: 'Acceso a ruta protegida', user: req.user });
});

// Ruta de prueba /ping
router.get('/ping', (req, res) => {
  res.json({ message: 'Backend conectado correctamente' });
});

module.exports = router;
