// backend/controllers/currencyController.js
const CurrencySetting = require("../models/CurrencySetting");

exports.getCurrency = async (req, res) => {
  try {
    const setting = await CurrencySetting.findOne({});
    res.json(setting || { currency: "USD", symbol: "$" });
  } catch (err) {
    res.status(500).json({ error: "Failed to load currency" });
  }
};

exports.updateCurrency = async (req, res) => {
  const { currency, symbol } = req.body;

  try {
    let setting = await CurrencySetting.findOne({});
    if (!setting) {
      setting = new CurrencySetting({ currency, symbol });
    } else {
      setting.currency = currency;
      setting.symbol = symbol;
    }

    await setting.save();
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: "Failed to update currency" });
  }
};