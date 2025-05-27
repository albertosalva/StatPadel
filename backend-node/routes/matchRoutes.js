// routes/matchRoutes.js
const express       = require('express')
const router        = express.Router()
const { checkAuth } = require('../middleware/auth')
const matchController      = require('../controllers/matchController')


router.get('/mine', checkAuth, matchController .getMyMatches)

router.delete('/:id', checkAuth, matchController .deleteMatch)

router.put('/:id', checkAuth, matchController .updateMatch)

router.get('/:id', checkAuth, matchController .getMatchById);

module.exports = router
