// src/models/Level5ActivityItem.js
const mongoose = require('mongoose');

const level5ActivityItemSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true
  },
  itemName: {
    type: String,
    required: true,
    trim: true
  },
  itemDescription: {
    type: String,
    trim: true
  },
  estimatedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    trim: true
  },
  parameter: {
    type: String,
    trim: true
  },
  institute: {
    type: String,
    trim: true
  },
  parentItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level4Activity',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Level5ActivityItem', level5ActivityItemSchema);