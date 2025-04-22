// models/Match.js
const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
});

module.exports = mongoose.model('Match', MatchSchema);