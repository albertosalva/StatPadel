// app.js

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Importamos cors
const mongoose = require('mongoose'); // Importamos Mongoose
require('dotenv').config();

const app = express();

// Conexión a MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/statpadel')
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

// Uso de las rutas de corners
const cornersRoutes = require('./routes/cornersRoutes');
app.use('/api/corners', cornersRoutes);

const videoRoutes = require('./routes/videoRoutes');
app.use('/api/video', videoRoutes);

// Arranque del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
