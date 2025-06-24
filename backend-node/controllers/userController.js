//controllers/userController.js
const User = require('../models/Users')
const Match = require('../models/Match')
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcrypt')
const { deleteMatchById } = require('../services/matchServices')


exports.searchUsers = async (req, res) => {
  try {
    console.log('[searchUsers] Parámetros de búsqueda:', req.query)
    const name = (req.query.name || '').trim()
    if (!name) {
      return res.status(400).json({ error: 'Falta parámetro q en query' })
    }

    // Búsqueda “empieza por”, case-insensitive
    const regex = new RegExp('^' + name, 'i')

    const users = await User
      .find({ username: regex })
      .limit(4)
      .select('username avatarPath')
      .lean()

    // Formatea la respuesta si es necesario
    const results = users.map(u => ({
      value: u.username, 
      label: u.username, 
      avatarUrl: u.avatarPath 
    }))

    console.log('[searchUsers] Resultados encontrados:', results)
    return res.json(results)

  } catch (err) {
    console.error('[searchUsers] Error:', err)
    return res.status(500).json({ error: 'Error buscando usuarios' })
  }
}


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
    console.error('[❌ Error en checkUserExists]:', error);
    res.status(500).json({ message: 'Error al verificar el usuario' });
  }
}

exports.updateProfile = async (req, res) => {
  const userId = req.user.id  // viene de authenticateToken
  const { name, email, currentPassword, newPassword, level } = req.body

  try {
    // 1) Buscar usuario
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const updates = {}

    // 2) Cambio de contraseña
    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Faltan campos de contraseña' })
      }
      const pwd = await bcrypt.compare(currentPassword, user.password)
      if (!pwd) {
        return res.status(401).json({ message: 'Contraseña actual incorrecta' })
      }
      updates.password = newPassword
    }

    // 3) Cambio de nombre o email
    if (name && name !== user.username) {
      // Buscamos otro usuario con ese username
      const existsName = await User.findOne({ 
        username: name, 
        _id: { $ne: userId } 
      })
      if (existsName) {
        console.warn('[updateProfile] nombre de usuario ya en uso:', name)
        return res.status(400).json({ message: 'El nombre de usuario ya está en uso' })
      }
      updates.username = name
    }
    if (email && email !== user.email) {
      // Buscamos otro usuario con ese email
      const existsEmail = await User.findOne({ 
        email: email, 
        _id: { $ne: userId } 
      })
      if (existsEmail) {
        console.warn('[updateProfile] email ya registrado:', email)
        return res.status(400).json({ message: 'El correo ya está registrado' })
      }
      updates.email = email
    }
    if(level && level !== user.level) {
      const validLevels = ['Principiante', 'Intermedio', 'Avanzado']
      if (!validLevels.includes(level)) {
        return res.status(400).json({ message: 'Nivel no válido' })
      }
      updates.level = level
    }


    // 4) Cambio de avatar
    if (req.file) {
      const newFileName = req.file.filename
      const avatarPath = '/uploads/avatars/' + newFileName

      const defaultAvatar = '/uploads/avatars/avatarDefault.png'

      const avatarsDir = path.join(__dirname, '..', 'uploads', 'avatars')
      const files = fs.readdirSync(avatarsDir)

      files.forEach(file => {
        const isUserAvatar = (file.startsWith(userId) && file !== defaultAvatar && file !== newFileName)
        if (isUserAvatar) {
          const fullPath = path.join(avatarsDir, file)
          fs.unlink(fullPath, err => {
            if (err) {
              console.warn('[updateProfile] ❌ No se pudo borrar avatar anterior:', fullPath)
            } else {
              console.log('[updateProfile] ✅ Avatar anterior eliminado:', fullPath)
            }
          })
        }
      })

      updates.avatarPath = avatarPath
    }


    // 4) Si no hay nada que hacer
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No hay cambios que guardar' })
    }

    // 5) Aplicar cambios y guardar
    Object.assign(user, updates)
    await user.save()

    // 6) Devolver datos actualizados (sin password)
    return res.json({
      userId: user._id,
      username: user.username,
      email: user.email,
      level: user.level,
      avatar: user.avatarPath || null,
    })
  } catch (err) {
    console.error('[❌ updateProfile]:', err)
    return res.status(500).json({ message: 'Error en el servidor' })
  }
}


exports.deleteUser = async (req, res) => {
  const userId = req.user.id 

  try {
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    const matches = await Match.find({ owner: userId }, '_id').lean()

    await Promise.all(
      matches.map(m => deleteMatchById(m._id.toString(), userId))
    )
    console.log(`[deleteUser] Eliminados ${matches.length} partidos del usuario ${userId}`)

    const uploadsDir = path.join(__dirname, '..', 'uploads', userId)
    try {
      await fs.rm(uploadsDir, { recursive: true, force: true })
      console.log(`[deleteUser] Carpeta borrada: ${uploadsDir}`)
    } catch (errFs) {
      console.warn(`[deleteUser] No se pudo borrar carpeta ${uploadsDir}:`, errFs.message)
    }

    await User.findByIdAndDelete(userId)
    console.log(`[deleteUser] Usuario ${userId} eliminado`)

    return res.json({ message: 'Usuario eliminado correctamente' })

  } catch (err) {
    console.error('[❌ deleteUser]:', err)
    return res.status(500).json({ message: 'Error en el servidor' })
  }
}