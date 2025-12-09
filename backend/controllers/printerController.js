// controllers/printerController.js
const Printer = require("../models/Printer");

// Get all printers (max 2)
exports.getPrinters = async (req, res) => {
  try {
    const printers = await Printer.find().limit(2);
    res.json(printers);
  } catch (err) {
    res.status(500).json({ error: "Failed to load printers" });
  }
};

// Add or update a printer (ensure max 2)
exports.upsertPrinter = async (req, res) => {
  const { id, name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: "Printer name is required" });
  }

  try {
    const count = await Printer.countDocuments();
    if (!id && count >= 2) {
      return res.status(400).json({ error: "Maximum of 2 printers allowed" });
    }

    let printer;
    if (id) {
      printer = await Printer.findByIdAndUpdate(id, { name: name.trim() }, { new: true, runValidators: true });
    } else {
      printer = new Printer({ name: name.trim() });
      await printer.save();
    }

    res.json(printer);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Printer name already exists" });
    }
    res.status(500).json({ error: "Failed to save printer" });
  }
};

// Delete a printer
exports.deletePrinter = async (req, res) => {
  const { id } = req.params;

  try {
    await Printer.findByIdAndDelete(id);
    res.json({ message: "Printer deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete printer" });
  }
};