// app.js

/**
 * @overview
 * <h1>StatPadel API</h1>
 *
 * <ul>
 *   <li>Bienvenido a la documentación de la API de StatPadel.</li>
 *   <li>Aquí encontrarás todos los módulos, rutas y tipos de datos disponibles.</li>
 * </ul>
 */



/**
 * @typedef EnvConfig
 * @property {string} [PORT=3000]        Puerto donde escucha el servidor.
 * @property {string} JWT_SECRET         Clave secreta para firmar y verificar JWT.
 * @property {string} VIDEO_API_HOST     Host de tu API de vídeo (FastAPI).
 * @property {string} VIDEO_API_PORT     Puerto de tu API de vídeo.
 * @property {string} MONGODB_URI        URI de conexión a MongoDB.
 * @property {string} INFLUX_URL         URL del cliente de InfluxDB.
 * @property {string} INFLUX_TOKEN       Token de autenticación para InfluxDB.
 * @property {string} INFLUX_ORG         Organización de InfluxDB.
 * @property {string} INFLUX_BUCKET      Bucket de InfluxDB donde guardas los datos.
 */

/**
 * @module app
 * @description
 * Configura y arranca el servidor Express de StatPadel:
 * <ul>
 *  <li>Conexión a MongoDB</li>
 *  <li>Middlewares (JSON, CORS)</li>
 *  <li>Rutas de la API</li>
 *  <li>Carpetas temporales y de uploads</li>
 *  <li>Arranque del servidor</li>
 * </ul>
 * @see EnvConfig
 * @example
 * // Arranca en modo desarrollo con nodemon y puerto 3000
 * $ PORT=3000 nodemon app.js
 */

const express = require('express');
const cors = require('cors'); 
const mongoose = require('mongoose'); 
require('dotenv').config();

const fs = require('fs');
const path = require('path');

const app = express();

// Conexión a MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/statpadel';
mongoose.connect(mongoURI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));


// Middleware para parsear JSON
//app.use(express.json());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));
// Aplica CORS
app.use(cors({ origin: '*' }));

// Asegurarse de que la carpeta "temp" existe
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
  console.log('Carpeta "temp" creada.');
}

// Rutas de la API
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const videoRoutes = require('./routes/videoRoutes');
app.use('/api/video', videoRoutes);

const matchRoutes = require('./routes/matchRoutes');
app.use('/api/matches', matchRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Middleware para servir archivos estáticos de la carpeta "uploads"
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Arranque del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
