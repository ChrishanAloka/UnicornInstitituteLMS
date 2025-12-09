const DeliveryCharge = require("../models/DeliveryCharge");

// GET /api/auth/admin/delivery-charge
exports.getDeliveryCharge = async (req, res) => {
  try {
    const charge = await DeliveryCharge.findOne({});
    if (!charge) {
      return res.json({ amount: 0, isActive: false });
    }
    res.json(charge);
  } catch (err) {
    console.error("Failed to load delivery charge:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/auth/admin/delivery-charge
exports.updateDeliveryCharge = async (req, res) => {
  const { amount, isActive } = req.body;

  try {
    let charge = await DeliveryCharge.findOne({});

    if (!charge) {
      charge = new DeliveryCharge({ amount, isActive });
    } else {
      charge.amount = amount;
      charge.isActive = isActive;
    }

    await charge.save();
    res.json(charge);
  } catch (err) {
    console.error("Failed to update delivery charge:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};