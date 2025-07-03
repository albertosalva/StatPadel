// src/routes/geolocationRoutes.js

/**
 * @module routes/geolocationRoutes
 * @description
 * Define las rutas relacionadas con geolocalización mediante los servicios de Google:
 * <ul>
 *   <li><code>GET /autocomplete</code>: predicciones de direcciones a partir de texto.</li>
 *   <li><code>GET /geocode</code>: coordenadas geográficas y placeId a partir de una dirección.</li>
 * </ul>
 */

const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/auth');
const geolocationController = require('../controllers/geolocationController');

/**
 * Predicciones de dirección desde Google Places Autocomplete.
 *
 * @name autocomplete
 * @route GET /api/geolocation/autocomplete
 * @queryparam {string} input - Texto parcial de la dirección a completar.
 * @middleware checkAuth
 * @returns {void}
 */
router.get('/autocomplete', checkAuth, geolocationController.autocomplete);

/**
 * Obtiene latitud, longitud y placeId para una dirección específica.
 *
 * @name geocode
 * @route GET /api/geolocation/geocode
 * @queryparam {string} address - Dirección completa a geocodificar.
 * @middleware checkAuth
 * @returns {void}
 */
router.get('/geocode', checkAuth, geolocationController.geocode);

module.exports = router;
