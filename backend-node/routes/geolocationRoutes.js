// src/routes/geolocationRoutes.js

const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/auth');
const geolocationController = require('../controllers/geolocationController');

/**
 * GET /api/geolocation/autocomplete?input=...
 * Devuelve predicciones de dirección desde Google Places Autocomplete.
 */
router.get('/autocomplete', checkAuth, geolocationController.autocomplete);

/**
 * GET /api/geolocation/geocode?address=...
 * Devuelve lat/lng y placeId para una dirección usando Google Geocoding API.
 */
router.get('/geocode', checkAuth, geolocationController.geocode);

module.exports = router;
