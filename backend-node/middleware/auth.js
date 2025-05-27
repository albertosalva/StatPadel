// middleware/auth.js
const jwt = require('jsonwebtoken')

function checkAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    console.log('Payload JWT:', payload)
    // payload.id corresponde al user._id que firmamos
    req.user = { id: payload.sub, username: payload.username }
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

module.exports = { checkAuth }
