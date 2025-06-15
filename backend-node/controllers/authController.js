// controllers/authController.js

// Importación de módulos
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')
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
    //if (password !== user.password) {
    //  return res.status(401).json({ message: 'Credenciales inválidas' });
    //}

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Contraseña incorrecta' })
    }

    // Si las credenciales son correctas, genera un token JWT
    const token = jwt.sign(
      { sub: user._id.toString(), username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    const userId = user._id.toString(); // Convertir a string si es necesario
    
    return res.json({ token: token, username: user.username , userId: userId});
    
  } catch (err) {
    console.error('Error en el login:', err);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Controlador para registrar nuevos usuarios
exports.register = async (req, res) => {
  const { nombre, email, password } = req.body;

  try {
    const existingByUsername = await Usuario.findOne({ username: nombre });
    if (existingByUsername) {
      return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
    }

    const existingByEmail = await Usuario.findOne({ email });
    if (existingByEmail) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }


    const newUser = new Usuario({
      username: nombre,
      email: email,
      password: password //Se hashea en el modelo de Users.js
    });

    await newUser.save();
    
    res.json({ message: 'Usuario registrado exitosamente', user: newUser });
  } catch (err) {
    console.error('Error en el login:', err);
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
    //req.user = decoded;
    req.user = { id: decoded.sub, username: decoded.username }
    next();
  });
};
