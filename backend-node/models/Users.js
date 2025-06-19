// models/Usuario.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
    password: { 
        type: String,
        required: true 
    },
    avatarPath: {
        type: String,
        default: null
    },
}, { 
    collection: 'users', 
    timestamps: true
});

usuarioSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
      const saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
      next()
    } catch (err) {
      next(err);
    }
});

module.exports = mongoose.model('User', usuarioSchema);
