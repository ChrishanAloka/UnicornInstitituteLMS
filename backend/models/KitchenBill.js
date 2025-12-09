// backend/models/KitchenBill.js
const mongoose = require("mongoose");

const kitchenBillSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["Gas", "Electricity", "Water", "Cleaning", "Repairs", "Other"]
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

module.exports = mongoose.model("KitchenBill", kitchenBillSchema);