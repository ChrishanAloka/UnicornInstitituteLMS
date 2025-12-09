// src/models/Level3Component.js
const mongoose = require('mongoose');

const level3ComponentSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true
  },
  componentName: {
    type: String,
    required: true,
    trim: true
  },
  componentDescription: {
    type: String,
    trim: true
  },
  estimatedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  parentComponent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level2Component',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Level3Component', level3ComponentSchema);