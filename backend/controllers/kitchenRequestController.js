const KitchenRequest = require("../models/KitchenRequest");
const User = require("../models/User");

// Submit a new request
exports.submitRequest = async (req, res) => {
  const { item, quantity, unit, reason } = req.body;

  if (!item || !quantity) {
    return res.status(400).json({ error: "Item and quantity are required" });
  }

  try {
    const newRequest = new KitchenRequest({
      requestedBy: req.user.id,
      item,
      quantity,
      unit,
      reason,
      status: "Pending"
    });

    await newRequest.save();
    res.json(newRequest);
  } catch (err) {
    console.error("Failed to submit request:", err.message);
    res.status(500).json({ error: "Failed to submit request" });
  }
};

// Get all requests (admin only)
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await KitchenRequest.find({status: "Pending"}).populate("requestedBy", "name role").sort({ date: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to load requests" });
  }
};

// Update request status (admin only)
exports.updateRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updated = await KitchenRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update request" });
  }
};

// Get all requests by current user
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await KitchenRequest.find({ requestedBy: req.user.id }).sort({ date: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to load your requests" });
  }
};