const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  companyName: { // ✅ New field
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: false,
    unique: true,   // 👈 enforce uniqueness
    sparse: true,   // 👈 ignore documents where email is missing
    trim: true,
  },
  address: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Supplier", supplierSchema);