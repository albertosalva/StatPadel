const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const { checkAuth } = require('../middleware/auth')

const multer = require('multer')
const path = require('path')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/')
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    cb(null, req.user.id + ext) // nombre del archivo: ID del usuario
  }
})

const upload = multer({ storage: storage  })

// Ruta para iniciar sesión
router.post('/check', userController.checkUserExists)

router.put('/update', checkAuth, upload.single('avatar'), userController.updateProfile)

router.delete('/delete', checkAuth, userController.deleteUser)

router.get('/search', checkAuth, userController.searchUsers)

module.exports = router;