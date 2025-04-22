// controllers/videoController.js

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const FLASK_FastAPI = "http://127.0.0.1:8000";

// Función para subir un video temporalmente (sin análisis) y reenviarlo a FastAPI
exports.uploadVideoTemp = async (req, res) => {
  try {
    console.log("Archivo recibido en Node (uploadVideoTemp):", req.file);
    const filePath = req.file.path;
    
    // Crear un objeto FormData y adjuntar el archivo usando un stream
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), req.file.originalname);
    
    // Reenviar la petición a FastAPI (asegúrate de que la URL y puerto sean correctos)
    const response = await axios.post('http://127.0.0.1:8000/upload_video_temp', form, {
      headers: form.getHeaders()
    });
    
    // Una vez reenviado, elimina el archivo temporal de Node (si lo deseas)
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error al eliminar el archivo temporal:', err);
    });
    
    // Retorna la respuesta que envía FastAPI
    res.json(response.data);
  } catch (error) {
    console.error("Error en uploadVideoTemp:", error.message);
    res.status(error.response ? error.response.status : 500).json({ error: error.response ? error.response.data : "Error al subir el archivo" });
  }
};

// Función para subir un video y enviarlo a FastAPI para análisis
exports.uploadVideo = async (req, res) => {
  try {
    // La ruta del archivo subido (gestionado por multer)
    console.log("Archivo recibido:", req.file);
    const filePath = req.file.path;
    
    // Crear un formulario para reenviar el archivo a FastAPI
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath), req.file.originalname);
    
    // Realizamos la petición POST a FastAPI (asegúrate de que FastAPI esté corriendo en 127.0.0.1:8000)
    const response = await axios.post(`${FLASK_FastAPI}/upload_video`, form, {
      headers: form.getHeaders()
    });
    
    // Una vez obtenida la respuesta, eliminamos el archivo temporal
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error al eliminar el archivo temporal:', err);
    });
    
    // Devolvemos la respuesta recibida de FastAPI al cliente
    return res.json(response.data);
  } catch (error) {
    console.error("Error en uploadVideo:", error.message);
    // Si FastAPI devuelve una respuesta de error, la reenviamos
    return res.status(error.response ? error.response.status : 500).json({ 
      error: error.response ? error.response.data : "Error al reenviar la petición" 
    });
  }
};
