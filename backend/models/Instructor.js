const mongoose = require('mongoose');

const instructorSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phoneNo: { type: String, required: true, trim: true },
  address: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Instructor', instructorSchema);