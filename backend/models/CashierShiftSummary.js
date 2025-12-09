const mongoose = require("mongoose");

const cashierShiftSummarySchema = new mongoose.Schema(
  {
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    date: {
      type: Date,
      required: true
    },
    startingCash: {
      type: Number,
      required: true,
      min: 0
    },
    cashIns: [
      {
        description: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0.01 },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    cashOuts: [
      {
        description: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0.01 },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    totalCashFromOrders: {
      type: Number,
      required: true,
      min: 0
    },
    expectedClosingCash: {
      type: Number,
      required: true
    },
    actualClosingCash: { // Optional: if you want cashier to enter counted cash
      type: Number,
      default: null
    },
    discrepancy: { // Auto-calculated if actualClosingCash is provided
      type: Number,
      default: null
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    isSubmitted: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
cashierShiftSummarySchema.index({ cashierId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("CashierShiftSummary", cashierShiftSummarySchema);
