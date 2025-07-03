// src/controllers/geolocationController.js

/**
 * @module controllers/geolocationController
 * @description
 * Controlador para la gestión de funcionalidades de geolocalización utilizando la API de Google:
 * <ul>
 *   <li><code>autocomplete</code>: devuelve predicciones de dirección según texto parcial.</li>
 *   <li><code>geocode</code>: devuelve coordenadas (lat/lng) y placeId a partir de una dirección.</li>
 * </ul>
 */

const axios = require('axios');

const AUTO_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const GEO_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const KEY = process.env.GOOGLE_API_KEY;

/**
 * Devuelve predicciones de dirección desde Google Places Autocomplete.
 *
 * @async
 * @function autocomplete
 * @param   {express.Request}  req - La petición HTTP con el parámetro `input` en query.
 * @param   {express.Response} res - La respuesta HTTP con un array de predicciones.
 * @returns {Promise<express.Response>} Código 200 con predicciones o código de error.
 */
exports.autocomplete = async (req, res) => {
  const { input } = req.query;
  if (!input) return res.status(400).json({ error: 'El parámetro `input` es obligatorio' });

  try {
    const { data } = await axios.get(AUTO_URL, {
      params: { input, key: KEY, types: 'address', language: 'es' }
    });
    // Devuelve directamente data.predictions
    console.log('Predicciones de Autocomplete:', data.predictions);
    return res.json({ predictions: data.predictions });
  } catch (err) {
    console.error('Geolocation Autocomplete Error:', err.message);
    return res.status(500).json({ error: 'Error al obtener sugerencias de dirección' });
  }
};

/**
 * Devuelve coordenadas geográficas y placeId desde una dirección usando Google Geocoding API.
 *
 * @async
 * @function geocode
 * @param   {express.Request}  req - La petición HTTP con el parámetro `address` en query.
 * @param   {express.Response} res - La respuesta HTTP con latitud, longitud, placeId y datos crudos.
 * @returns {Promise<express.Response>} Código 200 con datos geográficos o código de error.
 */
exports.geocode = async (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'El parámetro `address` es obligatorio' });

  try {
    const { data } = await axios.get(GEO_URL, {
      params: { address, key: KEY }
    });
    // Devuelve primer resultado completo
    if (data.status !== 'OK' || !data.results.length) {
      return res.status(404).json({ error: 'No se encontraron coordenadas para esa dirección' });
    }
    const r = data.results[0];
    console.log('Geocoding Result:', r);
    return res.json({
      formatted: r.formatted_address,
      lat:       r.geometry.location.lat,
      lng:       r.geometry.location.lng,
      placeId:   r.place_id,
      raw:       r
    });
  } catch (err) {
    console.error('Geolocation Geocode Error:', err.message);
    return res.status(500).json({ error: 'Error al geocodificar la dirección' });
  }
};
