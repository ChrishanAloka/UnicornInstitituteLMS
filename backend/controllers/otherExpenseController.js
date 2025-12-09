// backend/controllers/otherExpenseController.js
const mongoose = require("mongoose");
const OtherExpense = require("../models/OtherExpense");

// Get all other expenses
exports.getExpenses = async (req, res) => {
  try {
    const expenses = await OtherExpense.find({}).sort({ date: -1 });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: "Failed to load expenses" });
  }
};

// backend/controllers/otherExpenseController.js

// ✅ Add this method
exports.getExpensesByDate = async (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: "Date is required" });
  }

  try {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const expenses = await OtherExpense.find({
      // addedBy: req.user.id,
      paymentMethod: "Cash",
      date: { $gte: start, $lte: end }
    }).sort({ date: -1 });

    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: "Failed to load expense records" });
  }
};

// Add new expense
exports.addExpense = async (req, res) => {
  const { category, amount, description, date, paymentMethod } = req.body;

  if (!category || !amount || !date) {
    return res.status(400).json({ error: "Category, amount, and date are required" });
  }

  try {
    const newExpense = new OtherExpense({
      category,
      amount,
      description,
      date: new Date(date),
      paymentMethod: paymentMethod || "Cash",
      addedBy: req.user.id
    });

    await newExpense.save();
    res.json(newExpense);
  } catch (err) {
    res.status(500).json({ error: "Failed to save expense" });
  }
};

// Update expense
exports.updateExpense = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (updates.date) {
    updates.date = new Date(updates.date);
  }

  try {
    const updated = await OtherExpense.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error("Update failed:", err.message);
    res.status(500).json({ error: "Failed to update expense" });
  }
};

// Delete expense
exports.deleteExpense = async (req, res) => {
  const { id } = req.params;

  try {
    await OtherExpense.findByIdAndDelete(id);
    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete expense" });
  }
};