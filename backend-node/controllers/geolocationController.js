// src/controllers/geolocationController.js

const axios = require('axios');

const AUTO_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const GEO_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const KEY = process.env.GOOGLE_API_KEY;

/**
 * Maneja /autocomplete: recibe `input` en query y devuelve JSON de predicciones.
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
 * Maneja /geocode: recibe `address` en query y devuelve JSON con resultados.
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
