const Expense = require("../models/Expense");

exports.addExpense = async (req, res) => {
  const { supplier, amount, description, date, billNo, paymentMethod } = req.body;

  if (!supplier || !amount || !billNo) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const newExpense = new Expense({
      supplier,
      amount,
      description,
      date: date || Date.now(),
      billNo,
      paymentMethod: paymentMethod || "Cash"
    });

    await newExpense.save();
    const populated = await newExpense.populate("supplier", "name contact");
    res.json(populated);
  } catch (err) {
    console.error("Failed to add expense:", err.message);
    res.status(500).json({ error: "Failed to add expense" });
  }
};

exports.getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find({}).populate("supplier").sort({ date: -1 });;
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ error: "Failed to load expenses" });
  }
};

// PUT /api/auth/expense/:id
exports.updateExpense = async (req, res) => {
  const { id } = req.params;
  const { amount, description, date, billNo, paymentMethod } = req.body;

  if (!amount || !billNo) {
    return res.status(400).json({ error: "Amount and Bill No are required" });
  }

  try {
    const updated = await Expense.findByIdAndUpdate(
      id,
      { amount, description, date, billNo, paymentMethod },
      { new: true }
    ).populate("supplier", "name contact");

    if (!updated) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update failed:", err.message);
    res.status(500).json({ error: "Failed to update expense" });
  }
};

// DELETE /api/auth/expense/:id
exports.deleteExpense = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Expense.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("Delete failed:", err.message);
    res.status(500).json({ error: "Failed to delete expense" });
  }
};