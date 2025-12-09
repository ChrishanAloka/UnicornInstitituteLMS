// src/models/Level1Component.js
const mongoose = require("mongoose");

const Level1ComponentSchema = new mongoose.Schema({
  code: { type: String, required: true, trim: true },
  componentName: { type: String, required: true, trim: true },
  componentDescription: { type: String, trim: true },
  estimatedAmount: { type: Number, default: 0, min: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model("Level1Component", Level1ComponentSchema);