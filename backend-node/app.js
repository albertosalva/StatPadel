// app.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Importamos cors
const mongoose = require('mongoose'); // Importamos Mongoose
require('dotenv').config();

const app = express();

// Conexión a MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/statpadel';
mongoose.connect(mongoURI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error al conectar a MongoDB:', err));


// Middleware para parsear JSON
app.use(express.json());

// Aplica CORS
app.use(cors({ origin: '*' }));

// Asegurarse de que la carpeta "temp" existe
const fs = require('fs');
const path = require('path');
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
  console.log('Carpeta "temp" creada.');
}

// Uso de las rutas de autenticación
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const videoRoutes = require('./routes/videoRoutes');
app.use('/api/video', videoRoutes);

const matchRoutes = require('./routes/matchRoutes');
app.use('/api/matches', matchRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Middleware para servir archivos estáticos de la carpeta "uploads"
app.use('/videos', express.static(path.join(__dirname, 'uploads')));


// Arranque del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
