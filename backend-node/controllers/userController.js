//controllers/userController.js

/**
 * @module controllers/userController
 * @description
 * Controlador para la gestión de usuarios:
 * <ul>
 *   <li><code>searchUsers</code>: busca usuarios por prefijo de nombre.</li>
 *   <li><code>checkUserExists</code>: verifica si un nombre de usuario ya existe.</li>
 *   <li><code>updateProfile</code>: actualiza datos de perfil, contraseña y avatar.</li>
 *   <li><code>deleteUser</code>: elimina al usuario y todos sus recursos asociados.</li>
 * </ul>
 */

const User = require('../models/Users');
const Match = require('../models/Match');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { deleteMatchById } = require('../services/matchServices');


/**
 * Busca hasta 4 usuarios cuyo username empiece por el parámetro `name`.
 *
 * @async
 * @function searchUsers
 * @param   {express.Request}  req      Petición con query `name`.
 * @param   {express.Response} res      Respuesta JSON con array de `{ value, label, avatarUrl }`.
 * @returns {Promise<express.Response>} Código 200 y resultados de búsqueda.
 * @throws  {Error}                     Si ocurre un error en la base de datos.
 */
exports.searchUsers = async (req, res) => {
  try {
    console.log('[searchUsers] Parámetros de búsqueda:', req.query);
    const name = (req.query.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Falta parámetro q en query' });
    }

    // Búsqueda “empieza por”
    const regex = new RegExp('^' + name, 'i');

    const users = await User
      .find({ username: regex })
      .limit(4)
      .select('username avatarPath')
      .lean();

    // Formatea la respuesta si es necesario
    const results = users.map(u => ({
      value: u.username, 
      label: u.username, 
      avatarUrl: u.avatarPath 
    }));

    console.log('[searchUsers] Resultados encontrados:', results);
    return res.json(results);

  } catch (err) {
    console.error('[searchUsers] Error:', err);
    return res.status(500).json({ error: 'Error buscando usuarios' });
  }
};


/**
 * Comprueba si un username ya está registrado.
 *
 * @async
 * @function checkUserExists
 * @param   {express.Request}  req      Petición con `{ username }` en body.
 * @param   {express.Response} res      Respuesta JSON `{ exists: boolean }`.
 * @returns {Promise<express.Response>} Código 200 y campo `exists`.
 * @throws  {Error}                     Si falla la consulta a la base de datos.
 */
exports.checkUserExists = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'El nombre de usuario es obligatorio' });
  }

  try {
    const user = await User.findOne({ username });
    //console.log('[checkUserExists] buscando usuario:', username);
    res.json({ exists: !!user });
  } catch (error) {
    console.error('[Error en checkUserExists]:', error);
    res.status(500).json({ message: 'Error al verificar el usuario' });
  }
};


/**
 * Actualiza el perfil del usuario autenticado: nombre, email, contraseña, nivel y avatar.
 *
 * @async
 * @function updateProfile
 * @param   {express.Request}  req      Petición con usuario en `req.user.id` y datos en body.
 * @param   {express.Response} res      Respuesta JSON con datos actualizados `{ userId, username, email, level, avatar }`.
 * @returns {Promise<express.Response>} Código 200 y perfil actualizado.
 * @throws  {Error}                     Si faltan campos, credenciales incorrectas o falla el guardado.
 */
exports.updateProfile = async (req, res) => {
  const userId = req.user.id;
  const { name, email, currentPassword, newPassword, level } = req.body;

  try {
    // Buscar usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const updates = {};

    // Cambio de contraseña
    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Faltan campos de contraseña' });
      }
      const pwd = await bcrypt.compare(currentPassword, user.password);
      if (!pwd) {
        return res.status(401).json({ message: 'Contraseña actual incorrecta' });
      }
      updates.password = newPassword;
    }

    // Cambio de nombre o email
    if (name && name !== user.username) {
      // Buscamos otro usuario con ese username
      const existsName = await User.findOne({ 
        username: name, 
        _id: { $ne: userId } 
      });
      if (existsName) {
        console.warn('[updateProfile] nombre de usuario ya en uso:', name);
        return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
      }
      updates.username = name;
    }
    if (email && email !== user.email) {
      // Buscamos otro usuario con ese email
      const existsEmail = await User.findOne({ 
        email: email, 
        _id: { $ne: userId } 
      });
      if (existsEmail) {
        console.warn('[updateProfile] email ya registrado:', email);
        return res.status(400).json({ message: 'El correo ya está registrado' });
      }
      updates.email = email;
    }
    if(level && level !== user.level) {
      const validLevels = ['Principiante', 'Intermedio', 'Avanzado'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ message: 'Nivel no válido' });
      }
      updates.level = level;
    }


    // Cambio de avatar
    if (req.file) {
      const newFileName = req.file.filename;
      const avatarPath = '/uploads/avatars/' + newFileName;

      const defaultAvatar = '/uploads/avatars/avatarDefault.png';

      const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars');
      const files = fs.readdirSync(avatarsDir);

      files.forEach(file => {
        const isUserAvatar = (file.startsWith(userId) && file !== defaultAvatar && file !== newFileName);
        if (isUserAvatar) {
          const fullPath = path.join(avatarsDir, file);
          fs.unlink(fullPath, err => {
            if (err) {
              console.warn('[updateProfile] ❌ No se pudo borrar avatar anterior:', fullPath);
            } else {
              console.log('[updateProfile] ✅ Avatar anterior eliminado:', fullPath);
            }
          })
        }
      })

      updates.avatarPath = avatarPath;
    }


    // Si no hay nada que hacer
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No hay cambios que guardar' });
    }

    // Aplicar cambios y guardar
    Object.assign(user, updates);
    await user.save();

    // Devolver datos actualizados (sin password)
    return res.json({
      userId: user._id,
      username: user.username,
      email: user.email,
      level: user.level,
      avatar: user.avatarPath || null,
    });
  } catch (err) {
    console.error('[updateProfile]:', err)
    return res.status(500).json({ message: 'Error en el servidor' })
  }
};

/**
 * Elimina el usuario autenticado, sus partidos y todos los ficheros asociados.
 *
 * @async
 * @function deleteUser
 * @param   {express.Request}  req      Petición con usuario en `req.user.id`.
 * @param   {express.Response} res      Respuesta JSON `{ message }`.
 * @returns {Promise<express.Response>} Código 200 y mensaje de confirmación.
 * @throws  {Error}                     Si falla la eliminación en base de datos o ficheros.
 */
exports.deleteUser = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const matches = await Match.find({ owner: userId }, '_id').lean();

    await Promise.all(
      matches.map(m => deleteMatchById(m._id.toString(), userId))
    );
    console.log(`[deleteUser] Eliminados ${matches.length} partidos del usuario ${userId}`);

    const uploadsDir = path.join(__dirname, '..', 'uploads', userId);
    try {
      await fs.rm(uploadsDir, { recursive: true, force: true });
    } catch (errFs) {
      console.warn(`[deleteUser] No se pudo borrar carpeta ${uploadsDir}:`, errFs.message);
    }

    await User.findByIdAndDelete(userId);
    //console.log(`[deleteUser] Usuario ${userId} eliminado`);

    return res.json({ message: 'Usuario eliminado correctamente' });

  } catch (err) {
    console.error('[❌ deleteUser]:', err);
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};