// models/Match.js
const mongoose = require('mongoose');
const { Schema } = mongoose

const MatchSchema = new mongoose.Schema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
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
  analysis: {
    type: Object,
    default: null
  }
});

module.exports = mongoose.model('Match', MatchSchema);