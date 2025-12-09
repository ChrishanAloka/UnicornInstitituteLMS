// models/Customer.js
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
});

// Ensure phone is unique
// customerSchema.index({ phone: 1 }, { unique: true });

module.exports = mongoose.model('Customer', customerSchema);