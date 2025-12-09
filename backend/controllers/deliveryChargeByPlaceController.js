// controllers/deliveryChargeController.js
const DeliveryCharge = require("../models/DeliveryChargeByPlace");

// Get all delivery charges (max 2)
exports.getDeliveryCharges = async (req, res) => {
  try {
    const charges = await DeliveryCharge.find().sort({ placeName: 1 });
    res.json(charges);
  } catch (err) {
    res.status(500).json({ error: "Failed to load delivery charges" });
  }
};

// Add or update delivery charge
exports.upsertDeliveryCharge = async (req, res) => {
  const { id, placeName, charge } = req.body;

  if (!placeName || charge === undefined || charge < 0) {
    return res.status(400).json({ error: "Place name and valid charge are required" });
  }

  try {
    let updated;
    if (id) {
      // Update existing
      updated = await DeliveryCharge.findByIdAndUpdate(
        id,
        { placeName: placeName.trim(), charge: parseFloat(charge) },
        { new: true, runValidators: true }
      );
      if (!updated) {
        return res.status(404).json({ error: "Delivery charge not found" });
      }
    } else {
      // Create new
      updated = await DeliveryCharge.create({
        placeName: placeName.trim(),
        charge: parseFloat(charge)
      });
    }

    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "A delivery place with this name already exists" });
    }
    console.error("Save error:", err);
    res.status(500).json({ error: "Failed to save delivery charge" });
  }
};

// Delete delivery charge
exports.deleteDeliveryCharge = async (req, res) => {
  const { id } = req.params;

  try {
    await DeliveryCharge.findByIdAndDelete(id);
    res.json({ message: "Delivery charge deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete delivery charge" });
  }
};