// backend/models/CurrencySetting.js
const mongoose = require("mongoose");

const currencySchema = new mongoose.Schema({
  currency: {
    type: String,
    default: "USD"
  },
  symbol: {
    type: String,
    default: "$"
  }
});

module.exports = mongoose.model("CurrencySetting", currencySchema);