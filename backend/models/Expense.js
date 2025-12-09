const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  description: String,
  date: {
    type: Date,
    default: Date.now
  },
  billNo: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    default: "Cash"
  }
});

module.exports = mongoose.model("Expense", expenseSchema);