//controllers/userController.js
const User = require('../models/Users');

exports.checkUserExists = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'El nombre de usuario es obligatorio' });
  }

  try {
    const user = await User.findOne({ username });
    console.log('[checkUserExists] buscando usuario:', username);
    res.json({ exists: !!user });
  } catch (error) {
    console.error('[❌ Error en checkUserExists]:', error);
    res.status(500).json({ message: 'Error al verificar el usuario' });
  }
};

