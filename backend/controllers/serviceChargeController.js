const ServiceCharge = require("../models/ServiceCharge");

// GET /api/auth/admin/service-charge
exports.getServiceCharge = async (req, res) => {
  try {
    const charge = await ServiceCharge.findOne({});
    if (!charge) {
      return res.json({ dineInCharge: 0, isActive: false });
    }

    res.json(charge);
  } catch (err) {
    console.error("Failed to load service charge:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/auth/admin/service-charge
exports.updateServiceCharge = async (req, res) => {
  const { dineInCharge, isActive } = req.body;

  if (typeof dineInCharge !== "number") {
    return res.status(400).json({ error: "Invalid service charge value" });
  }

  try {
    let charge = await ServiceCharge.findOne({});

    if (!charge) {
      charge = new ServiceCharge({ dineInCharge, isActive });
    } else {
      charge.dineInCharge = dineInCharge;
      charge.isActive = isActive;
    }

    await charge.save();
    res.json(charge);
  } catch (err) {
    console.error("Failed to update service charge:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};