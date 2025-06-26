// routes/matchRoutes.js

/**
 * @module routes/matchRoutes
 * @description
 * Define las rutas para la gestión de partidos:
 * <ul>
 *   <li><code>GET /generalStats</code>: estadísticas globales del usuario.</li>
 *   <li><code>GET /lastStats</code>: métricas de los últimos 4 partidos donde participa.</li>
 *   <li><code>GET /mine</code>: obtiene los partidos del usuario.</li>
 *   <li><code>DELETE /:id</code>: elimina un partido por su ID.</li>
 *   <li><code>PUT /:id</code>: actualiza nombre, fecha y ubicación de un partido.</li>
 *   <li><code>GET /:id</code>: obtiene los detalles de un partido.</li>
 *   <li><code>PUT /:id/players</code>: reasigna las posiciones de jugadores de un partido.</li>
 * </ul>
 */

const express       = require('express');
const router        = express.Router();
const { checkAuth } = require('../middleware/auth');
const matchController      = require('../controllers/matchController');

/**
 * Estadísticas globales del usuario (total de vídeos y fecha último vídeo).
 *
 * @name getGeneralStats
 * @route GET /api/matches/generalStats
 * @middleware checkAuth
 * @returns {void}
 */
router.get('/generalStats', checkAuth, matchController.getGeneralStats);


/**
 * Métricas de los últimos 4 partidos donde participa el usuario.
 *
 * @name getLastMatchesUserStats
 * @route GET /api/matches/lastStats
 * @middleware checkAuth
 * @returns {void}
 */
router.get('/lastStats', checkAuth, matchController.getLastMatchesUserStats);


/**
 * Obtiene todos los partidos donde el usuario participa o es propietario.
 *
 * @name getMyMatches
 * @route GET /api/matches/mine
 * @middleware checkAuth
 * @returns {void}
 */
router.get('/mine', checkAuth, matchController .getMyMatches);


/**
 * Elimina un partido y sus datos asociados.
 *
 * @name deleteMatch
 * @route DELETE /api/matches/:id
 * @middleware checkAuth
 * @param   {string} id – ID del partido a eliminar.
 * @returns {void}
 */
router.delete('/:id', checkAuth, matchController .deleteMatch);

/**
 * Actualiza nombre, fecha y ubicación de un partido.
 *
 * @name updateMatch
 * @route PUT /api/matches/:id
 * @middleware checkAuth
 * @param   {string} id – ID del partido a actualizar.
 * @returns {void}
 */
router.put('/:id', checkAuth, matchController .updateMatch);


/**
 * Obtiene todos los detalles de un partido, incluyendo ruta de vídeo y posiciones.
 *
 * @name getMatchById
 * @route GET /api/matches/:id
 * @middleware checkAuth
 * @param   {string} id – ID del partido a recuperar.
 * @returns {void}
 */
router.get('/:id', checkAuth, matchController .getMatchById);


/**
 * Reasigna las posiciones de jugadores de un partido por username.
 *
 * @name updatePlayers
 * @route PUT /api/matches/:id/players
 * @middleware checkAuth
 * @param   {string} id – ID del partido a modificar.
 * @returns {void}
 */
router.put('/:id/players', checkAuth, matchController.updatePlayers);


module.exports = router;
