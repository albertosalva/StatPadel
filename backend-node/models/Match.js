// models/Match.js

/**
 * @module models/Match
 * @description Esquema Mongoose de partidos de StatPadel.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const MatchSchema = new mongoose.Schema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  matchName: {
    type: String,
    required: true,
  },
  matchDate: {
    type: Date,
    required: true,
  },
  matchLocation: {
    type: String,
    required: true,
  },
  videoName: {
    type: String,
    required: true,
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  filePath: {
    type: String,
    required: true,
  },
  status:     { 
    type: String, 
    enum: ['pendiente', 'analizando', 'analizado'], 
    default: 'pendiente' 
  },
  analysis: {
    type: Object,
    default: null
  }, 
  heatmap: {
    type: Object,
    default: {}
  },
  playerPositions: {
    type: Map,
    of: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    default: {}
  }
}
);

module.exports = mongoose.model('Match', MatchSchema);