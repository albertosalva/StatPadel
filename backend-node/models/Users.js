// models/Usuario.js

const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true, 
        unique: true 
    },
    email: { 
        type: String,
        required: true, 
        unique: true 
    },
    password: { type: String,
        required: true 
    }
}, { collection: 'users', timestamps: true });

module.exports = mongoose.model('Usuario', usuarioSchema);
