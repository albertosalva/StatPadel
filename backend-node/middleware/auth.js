// middleware/auth.js

/**
 * @module middleware/auth
 * @description
 * Middleware para proteger rutas verificando la cabecera Authorization con JWT.
 */

const jwt = require('jsonwebtoken');

/**
 * Comprueba la presencia y validez de un token JWT en la cabecera Authorization.
 *
 * @function checkAuth
 * @param   {express.Request}  req    Objeto de petición HTTP.
 * @param   {express.Response} res    Objeto de respuesta HTTP.
 * @param   {Function}         next   Función para pasar al siguiente middleware.
 * @returns {void}
 * @throws  {401}                     Si no se proporciona token o es inválido.
 */
function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Payload JWT:', payload);
    // payload.id corresponde al user._id que firmamos
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = { checkAuth };
