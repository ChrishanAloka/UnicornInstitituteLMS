const mongoose = require("mongoose");

const serviceChargeSchema = new mongoose.Schema({
  dineInCharge: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("ServiceCharge", serviceChargeSchema);