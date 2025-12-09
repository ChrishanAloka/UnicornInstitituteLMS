const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  nic: {
    type: String,
    required: true,
    unique: true
  },
  vehicle: {
    type: String,
    required: true
  },
  numberPlate: {
    type: String,
    required: true,
    uppercase: true
  },
  address: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
});

module.exports = mongoose.model("Driver", driverSchema);