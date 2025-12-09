// models/DeliveryCharge.js
const mongoose = require("mongoose");

const deliveryChargeByPlaceSchema = new mongoose.Schema({
  placeName: {
    type: String,
    required: true,
    trim: true,
    unique: true // optional: ensure no duplicate places
  },
  charge: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

module.exports = mongoose.model("DeliveryChargeByPlace", deliveryChargeByPlaceSchema);