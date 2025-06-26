// controllers/authController.js

/**
 * @module controllers/authController
 * @description
 * Controlador de autenticación:
 * <ul>
 *   <li><code>login</code>: inicia sesión y devuelve un JWT.</li>
 *   <li><code>register</code>: registra un nuevo usuario.</li>
 *   <li><code>verifyToken</code>: middleware para validar JWT en rutas protegidas.</li>
 * </ul>
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Usuario = require('../models/Users'); // Importamos el modelo de Usuario
require('dotenv').config();


/**
 * Inicia sesión validando credenciales y retorna un token JWT.
 *
 * @async
 * @function login
 * @param   {express.Request}  req        Petición con `{ username, password }` en body.
 * @param   {express.Response} res        Respuesta JSON con `{ token, username, email, userId, avatarPath, level }`.
 * @returns {Promise<express.Response>}   Código 200 y datos del usuario + token.
 * @throws  {401}                         Si usuario no existe o contraseña incorrecta.
 * @throws  {500}                         Si ocurre un error en el servidor.
 */
exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Busca el usuario por su nombre
    const user = await Usuario.findOne({ username: username });
    
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Si las credenciales son correctas, genera un token JWT
    const token = jwt.sign(
      { sub: user._id.toString(), username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const respuesta = {
      token,
      username: user.username,
      email: user.email,
      userId: user._id.toString(),
      avatarPath: user.avatarPath,
      level: user.level
    };

    console.log('Usuario autenticado:', respuesta);
    
    return res.json(respuesta);
    
  } catch (err) {
    console.error('Error en el login:', err);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};


/**
 * Registra un nuevo usuario con datos básicos y avatar por defecto.
 *
 * @async
 * @function register
 * @param   {express.Request}  req        Petición con `{ nombre, email, password, level }` en body.
 * @param   {express.Response} res        Respuesta JSON con mensaje y objeto `user`.
 * @returns {Promise<express.Response>}   Código 200 y usuario creado.
 * @throws  {400}                         Si nombre o email ya en uso, o nivel inválido.
 * @throws  {500}                         Si ocurre un error en el servidor.
 */
exports.register = async (req, res) => {
  const { nombre, email, password, level } = req.body;

  try {
    const existingByUsername = await Usuario.findOne({ username: nombre });
    if (existingByUsername) {
      return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
    }

    const existingByEmail = await Usuario.findOne({ email });
    if (existingByEmail) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    if (!['Principiante','Intermedio','Avanzado'].includes(level)) {
      return res.status(400).json({ message: 'Nivel no seleccionado' })
    }

    avatarPath = '/uploads/avatars/avatarDefault.png';


    const newUser = new Usuario({
      username: nombre,
      email: email,
      password: password, //Se hashea en el modelo de Users.js
      level: level,
      avatarPath: avatarPath
    });

    await newUser.save();
    
    res.json({ message: 'Usuario registrado exitosamente', user: newUser });
  } catch (err) {
    console.error('Error en el login:', err);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};


/**
 * Middleware que verifica la validez de un JWT en la cabecera Authorization.
 *
 * @function verifyToken
 * @param   {express.Request}  req    Petición HTTP.
 * @param   {express.Response} res    Respuesta HTTP.
 * @param   {Function}         next   Callback para continuar al siguiente middleware.
 * @returns {void}
 * @throws  {401}                     Si no se proporciona token o ha expirado.
 * @throws  {403}                     Si el token es inválido.
 */
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
    req.user = { id: decoded.sub, username: decoded.username };
    next();
  });
};
