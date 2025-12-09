// models/Printer.js
const mongoose = require("mongoose");

const printerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Printer", printerSchema);