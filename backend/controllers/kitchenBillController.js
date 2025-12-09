const mongoose = require("mongoose");
const KitchenBill = mongoose.model("KitchenBill");

// Get all bills
exports.getBills = async (req, res) => {
  try {
    const bills = await KitchenBill.find({}).sort({ date: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: "Failed to load bills" });
  }
};

// Add new bill
exports.addBill = async (req, res) => {
  const { type, amount, description, date, paymentMethod  } = req.body;

  if (!type || !amount || !date) {
    return res.status(400).json({ error: "Type, amount, and date are required" });
  }

  try {
    const newBill = new KitchenBill({
      type,
      amount,
      description,
      date: new Date(date),
      paymentMethod: paymentMethod || "Cash",
      addedBy: req.user.id
    });

    await newBill.save();
    res.json(newBill);
  } catch (err) {
    res.status(500).json({ error: "Failed to save bill" });
  }
};

// ✅ Update Bill
exports.updateBill = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (updates.date) {
    updates.date = new Date(updates.date);
  }

  try {
    const updated = await KitchenBill.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    // ✅ Always return 200 OK with updated bill
    res.status(200).json(updated); // Ensure valid JSON response
  } catch (err) {
    console.error("Update failed:", err.message);
    res.status(500).json({ error: "Failed to update bill" });
  }
};

// ✅ Delete Bill
exports.deleteBill = async (req, res) => {
  const { id } = req.params;

  try {
    await KitchenBill.findByIdAndDelete(id);
    // ✅ Return success message
    res.json({ message: "Bill deleted successfully" }); // ✔️
  } catch (err) {
    res.status(500).json({ error: "Failed to delete bill" });
  }
};