// src/models/ActivityItemsMarkProgress.js
const mongoose = require('mongoose');

const activityItemsMarkProgressSchema = new mongoose.Schema({
  activityItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level5ActivityItem',
    required: true
  },
  level4Activity: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level4Activity',
    required: true
  },
  level3Component: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level3Component',
    required: true
  },
  fromDate: {
    type: Date,
    required: true
  },
  toDate: {
    type: Date,
    required: true
  },
  physicalProgressDescription: {
    type: String,
    trim: true
  },
  physicalProgressPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  financialProgressAmount: {
    type: Number,
    required: true,
    min: 0
  },
  financialProgressPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ActivityItemsMarkProgress', activityItemsMarkProgressSchema);