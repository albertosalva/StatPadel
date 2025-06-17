//controllers/userController.js
const User = require('../models/Users')
const Match = require('../models/Match')
const fs = require('fs/promises')
const path = require('path')
const bcrypt = require('bcrypt')
const { deleteMatchById } = require('../services/matchServices')

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
  const { name, email, currentPassword, newPassword } = req.body

  console.log('[updateProfile] datos recibidos:', {
    userId,
    name,
    email,
    currentPassword: currentPassword, // solo para debug
    newPassword: newPassword // solo para debug
  })

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

    // 4) Si no hay nada que hacer
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No hay cambios que guardar' })
    }

    // 5) Aplicar cambios y guardar
    Object.assign(user, updates)
    await user.save()

    // 6) Devolver datos actualizados (sin password)
    return res.json({
      userId:   user._id,
      username: user.username,
      email:    user.email
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