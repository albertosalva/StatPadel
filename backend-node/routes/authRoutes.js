// routes/authRoutes.js

/**
 * @module routes/authRoutes
 * @description
 * Define las rutas de autenticación:
 * <ul>
 *   <li><code>POST /login</code>: inicia sesión y obtiene JWT.</li>
 *   <li><code>POST /register</code>: registra un nuevo usuario.</li>
 *   <li><code>GET /protected</code>: ruta protegida que valida JWT.</li>
 *   <li><code>GET /ping</code>: ruta de prueba para verificar conexión.</li>
 * </ul>
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');


/**
 * Inicia sesión validando credenciales.
 *
 * @name login
 * @route POST /api/auth/login
 * @param   {express.Request}  req  Petición con `{ username, password }`.
 * @param   {express.Response} res  Respuesta con token y datos de usuario.
 * @returns {void}
 * @throws  {401}                   Si credenciales inválidas.
 */
router.post('/login', authController.login);


/**
 * Registra un nuevo usuario.
 *
 * @name register
 * @route POST /api/auth/register
 * @param   {express.Request}  req  Petición con `{ nombre, email, password, level }`.
 * @param   {express.Response} res  Respuesta con confirmación y datos del usuario.
 * @returns {void}
 * @throws  {400}                   Si nombre/email ya en uso o nivel inválido.
 */
router.post('/register', authController.register);

/**
 * Ejemplo de ruta protegida que verifica JWT.
 *
 * @name protected
 * @route GET /api/auth/protected
 * @middleware verifyToken
 * @param   {express.Request}  req  Petición con cabecera Authorization.
 * @param   {express.Response} res  Respuesta con `{ message, user }`.
 * @returns {void}
 * @throws  {401|403}               Si token ausente, expirado o inválido.
 */
router.get('/protected', authController.verifyToken, (req, res) => {
  res.json({ message: 'Acceso a ruta protegida', user: req.user });
});

/**
 * Ruta de diagnóstico para comprobar conexión al backend.
 *
 * @name ping
 * @route GET /api/auth/ping
 * @param   {express.Request}  req  Petición vacía.
 * @param   {express.Response} res  Respuesta con `{ message }`.
 * @returns {void}
 */
router.get('/ping', (req, res) => {
  res.json({ message: 'Backend conectado correctamente' });
});

module.exports = router;
