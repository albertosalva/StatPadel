// controllers/cornersController.js

const axios = require('axios');

// URL base del servicio Flask 
//const FLASK_URL = "http://127.0.0.1:5000";
const host = process.env.API_HOST;
const port = process.env.API_PORT_CORNERS;
const FLASK_URL = `http://${host}:${port}`;

exports.loadVideo = async (req, res) => {
    try {
      console.log("Body recibido en Node:", req.body);
      const response = await axios.post(`${FLASK_URL}/load_video`, req.body);
      return res.json(response.data);
    } catch (error) {
      console.error("Error en loadVideo:", error.message, error.response?.data);
      return res.status(error.response?.status || 500).json({ error: error.response?.data || "Error al cargar el primer frame" });
    }
  };
  

exports.getFrame = async (req, res) => {
  try {
    // Envía una solicitud GET al endpoint /get_frame de Flask.
    const response = await axios.get(`${FLASK_URL}/get_frame`);
    return res.json(response.data);
  } catch (error) {
    console.error("Error en getFrame:", error.message);
    return res.status(error.response?.status || 500).json({ error: error.response?.data || "Error al obtener el frame" });
  }
};

