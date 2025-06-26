// routes/userRoutes.js

/**
 * @module routes/userRoutes
 * @description
 * Define las rutas relacionadas con usuarios:
 * <ul>
 *   <li><code>POST /check</code>: verifica si un nombre de usuario existe.</li>
 *   <li><code>PUT /update</code>: actualiza el perfil del usuario autenticado (con avatar opcional).</li>
 *   <li><code>DELETE /delete</code>: elimina al usuario autenticado y sus datos.</li>
 *   <li><code>GET /search</code>: busca usuarios por prefijo de nombre.</li>
 * </ul>
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { checkAuth } = require('../middleware/auth');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/');
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.user.id + ext); // nombre del archivo: ID del usuario
  }
});

const upload = multer({ storage: storage  });


/**
 * Verifica si un username ya está registrado.
 *
 * @name checkUserExists
 * @route POST /api/users/check
 * @param   {express.Request}  req  Petición con `{ username }` en body.
 * @param   {express.Response} res  Respuesta JSON `{ exists: boolean }`.
 * @returns {void}
 * @throws  {Error}                 Si falla la consulta a la base de datos.
 */
router.post('/check', userController.checkUserExists);


/**
 * Actualiza el perfil del usuario autenticado, permite subir un avatar.
 *
 * @name updateProfile
 * @route PUT /api/users/update
 * @param   {express.Request}  req  Petición con usuario en `req.user.id`, posible archivo `avatar` y datos en body.
 * @param   {express.Response} res  Respuesta JSON con perfil actualizado.
 * @returns {void}
 * @throws  {Error}                 Si faltan campos o la actualización falla.
 */
router.put('/update', checkAuth, upload.single('avatar'), userController.updateProfile);


/**
 * Elimina al usuario autenticado y todos sus recursos.
 *
 * @name deleteUser
 * @route DELETE /api/users/delete
 * @param   {express.Request}  req  Petición con usuario en `req.user.id`.
 * @param   {express.Response} res  Respuesta JSON `{ message }`.
 * @returns {void}
 * @throws  {Error}                 Si la eliminación falla.
 */
router.delete('/delete', checkAuth, userController.deleteUser);


/**
 * Busca usuarios cuyo nombre empiece por el query `name`.
 *
 * @name searchUsers
 * @route GET /api/users/search
 * @param   {express.Request}  req  Petición con query `name`.
 * @param   {express.Response} res  Respuesta JSON con array de resultados.
 * @returns {void}
 * @throws  {Error}                 Si la búsqueda falla.
 */
router.get('/search', checkAuth, userController.searchUsers);

module.exports = router;