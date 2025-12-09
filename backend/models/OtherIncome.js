// backend/models/OtherIncome.js
const mongoose = require("mongoose");

const otherIncomeSchema = new mongoose.Schema({
  source: {
    type: String,
    required: true
  },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  description: String,
  paymentMethod: {
    type: String,
    default: "Cash"
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
});

module.exports = mongoose.model("OtherIncome", otherIncomeSchema);