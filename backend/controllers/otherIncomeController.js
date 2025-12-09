  // backend/controllers/otherIncomeController.js
  const mongoose = require("mongoose");
  // const OtherIncome = mongoose.model("OtherIncome");
  const OtherIncome = require("../models/OtherIncome");

  // Get all other income records
  exports.getIncomes = async (req, res) => {
    try {
      const incomes = await OtherIncome.find({}).sort({ date: -1 });
      res.json(incomes);
    } catch (err) {
      res.status(500).json({ error: "Failed to load income records" });
    }
  };

  // backend/controllers/otherIncomeController.js

  // ✅ Add this method (or update getIncomes)
  exports.getIncomesByDate = async (req, res) => {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "Date is required" });
    }

    try {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const incomes = await OtherIncome.find({
        // addedBy: req.user.id,
        paymentMethod: "Cash",
        date: { $gte: start, $lte: end }
      }).sort({ date: -1 });

      res.json(incomes);
    } catch (err) {
      res.status(500).json({ error: "Failed to load income records" });
    }
  };

  // Add new income
  exports.addIncome = async (req, res) => {
    const { source, amount, description, date, paymentMethod } = req.body;

    if (!source || !amount || !date) {
      return res.status(400).json({ error: "Source, amount, and date are required" });
    }

    try {
      const newIncome = new OtherIncome({
        source,
        amount,
        description,
        date: new Date(date),
        paymentMethod: paymentMethod || "Cash",
        addedBy: req.user.id
      });

      await newIncome.save();
      res.json(newIncome);
    } catch (err) {
      res.status(500).json({ error: "Failed to save income record" });
    }
  };

  // Update income
  exports.updateIncome = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (updates.date) {
      updates.date = new Date(updates.date);
    }

    try {
      const updated = await OtherIncome.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true
      });

      res.status(200).json(updated);
    } catch (err) {
      console.error("Update failed:", err.message);
      res.status(500).json({ error: "Failed to update income record" });
    }
  };

  // Delete income
  exports.deleteIncome = async (req, res) => {
    const { id } = req.params;

    try {
      await OtherIncome.findByIdAndDelete(id);
      res.json({ message: "Income record deleted successfully" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete income record" });
    }
  };