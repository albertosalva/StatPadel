const express = require('express')
const router = express.Router()
const userController = require('../controllers/userController')
const { checkAuth } = require('../middleware/auth')

// Ruta para iniciar sesión
router.post('/check', userController.checkUserExists)

router.put('/update', checkAuth, userController.updateProfile)

router.delete('/delete', checkAuth, userController.deleteUser)


module.exports = router;