const mongoose = require("mongoose");

const deliveryChargeSchema = new mongoose.Schema({
  amount: {
    type: Number,
    default: 0,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("DeliveryCharge", deliveryChargeSchema);