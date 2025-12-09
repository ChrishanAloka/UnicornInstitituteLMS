const mongoose = require("mongoose");

const kitchenRequestSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  item: { type: String, required: true },        // Item name
  quantity: { type: Number, required: true },    // Quantity needed
  unit: {                                       // ✅ New field
    type: String,
    enum: ["kg", "liters", "pcs", "grams", "ml", "packs"],
    default: "pcs"
  },
  reason: { type: String },                    // Why it's needed
  date: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  }
});

module.exports = mongoose.model("KitchenRequest", kitchenRequestSchema);