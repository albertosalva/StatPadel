// controllers/authController.js

// Importación de módulos
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Users'); // Importamos el modelo de Usuario
require('dotenv').config();

// Controlador para iniciar sesión
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Busca el usuario por su nombre (o podrías buscar por email)
    const user = await Usuario.findOne({ username: username });
    
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    // Compara la contraseña (en producción, usar bcrypt.compare)
    if (password !== user.password) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Si las credenciales son correctas, genera un token JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    return res.json({ token: token, username: user.username });
    
  } catch (err) {
    console.error('Error en el login:', err);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Controlador para registrar nuevos usuarios
exports.register = async (req, res) => {
  const { nombre, email, password } = req.body;
  try {
    const existingUser = await Usuario.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }
    const newUser = new Usuario({
      username: nombre,
      email: email,
      password: password
    });
    await newUser.save();
    res.json({ message: 'Usuario registrado exitosamente', user: newUser });
  } catch (err) {
    res.status(500).json({ message: 'Error en el servidor' });
  }
};


// Middleware para verificar el token en rutas protegidas
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token no proporcionado' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'El token ha expirado' });
      }
      return res.status(403).json({ message: 'Token inválido' });
    }
    req.user = decoded;
    next();
  });
};
