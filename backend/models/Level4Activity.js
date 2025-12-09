// src/models/Level4Activity.js
const mongoose = require('mongoose');

const level4ActivitySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true
  },
  activityName: {
    type: String,
    required: true,
    trim: true
  },
  activityDescription: {
    type: String,
    trim: true
  },
  estimatedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  parentActivity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level3Component',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Level4Activity', level4ActivitySchema);