const Driver = require("../models/Driver");

// POST /api/auth/drivers
exports.registerDriver = async (req, res) => {
  const { name, nic, vehicle, numberPlate, address, phone } = req.body;

  if (!name || !nic || !vehicle || !numberPlate || !address || !phone) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const existing = await Driver.findOne({ $or: [{ nic }, { numberPlate }] });
    if (existing) {
      return res.status(400).json({
        error: "NIC or Number Plate already exists"
      });
    }


    const newDriver = new Driver({
      name,
      nic,
      vehicle,
      numberPlate,
      address,
      phone,
      addedBy: req.user.id
    });

    await newDriver.save();

    res.json(newDriver);
  } catch (err) {
    console.error("Failed to register driver:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/auth/drivers
exports.getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find({}).sort({ createdAt: -1 });
    res.json(drivers);
  } catch (err) {
    console.error("Failed to load drivers:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/auth/drivers/:id
exports.updateDriver = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updatedDriver = await Driver.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedDriver) {
      return res.status(404).json({ error: "Driver not found" });
    }

    res.json(updatedDriver);
  } catch (err) {
    console.error("Update failed:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/auth/drivers/:id
exports.deleteDriver = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Driver.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Driver not found" });
    }

    res.json({ message: "Driver deleted successfully" });
  } catch (err) {
    console.error("Delete failed:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};