// backend/controllers/cashierShiftSummaryController.js
const mongoose = require("mongoose");
const CashierShiftSummary = require("../models/CashierShiftSummary");

// @desc    Submit cashier shift summary
// @route   POST /api/auth/cashier/shift-summary
// @access  Private (Cashier/Admin)
exports.submitShiftSummary = async (req, res) => {
  const {
    date,
    startingCash,
    cashIns,
    cashOuts,
    totalCashFromOrders,
    expectedClosingCash,
    actualClosingCash // optional
  } = req.body;

  try {
    // Validate required fields
    if (!date || startingCash === undefined || totalCashFromOrders === undefined || expectedClosingCash === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    

    // Parse and validate date
    const shiftDate = new Date(date);
    if (isNaN(shiftDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // console.log("Date",date, "Shiftdate", shiftDate );
    // Normalize date to start of day for consistency
    // shiftDate.setHours(0, 0, 0, 0);

    // Calculate discrepancy if actualClosingCash is provided
    let discrepancy = null;
    if (actualClosingCash !== undefined && actualClosingCash !== null) {
      discrepancy = parseFloat(actualClosingCash) - expectedClosingCash;
    }

    // Create new summary
    const newSummary = new CashierShiftSummary({
      cashierId: req.user.id,
      date: shiftDate,
      startingCash: parseFloat(startingCash),
      cashIns: cashIns || [],
      cashOuts: cashOuts || [],
      totalCashFromOrders: parseFloat(totalCashFromOrders),
      expectedClosingCash: parseFloat(expectedClosingCash),
      actualClosingCash: actualClosingCash !== undefined ? parseFloat(actualClosingCash) : null,
      discrepancy
    });

    const savedSummary = await newSummary.save();

    res.status(201).json({
      message: "Shift summary submitted successfully",
      data: savedSummary
    });
  } catch (err) {
    console.error("Shift summary submission failed:", err.message);
    if (err.code === 11000) {
      return res.status(409).json({ error: "Shift summary for this date already exists" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get cashier shift summaries
// @route   GET /api/auth/cashier/shift-summary
// @access  Private (Cashier/Admin)
exports.getShiftSummaries = async (req, res) => {
  try {
    const { startDate, endDate, cashierId } = req.query;

    let filter = {};

    // If user is cashier, only allow viewing their own summaries
    // if (req.user.role === "cashier") {
    //   filter.cashierId = req.user.id;
    // } else if (cashierId) {
    //   filter.cashierId = cashierId;
    // }

    // Handle date range
    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.date = { $lte: end };
    }

    const summaries = await CashierShiftSummary.find(filter)
      .populate("cashierId", "name email role")
      .sort({ date: -1 });

    res.json(summaries);
  } catch (err) {
    console.error("Failed to load shift summaries:", err.message);
    res.status(500).json({ error: "Failed to load summaries" });
  }
};

// @desc    Get cashier shift summary for specific date
// @route   GET /api/auth/cashier/shift-summary/:date
// @access  Private (Cashier/Admin)
exports.getShiftSummaryByDate = async (req, res) => {
  try {
    const shiftDate = new Date(req.params.date);
    if (isNaN(shiftDate.getTime())) {
      return res.status(400).json({ error: "Invalid date" });
    }

    // Normalize to full day
    const startOfDay = new Date(shiftDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(shiftDate);
    endOfDay.setHours(23, 59, 59, 999);

    let filter = {
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    };

    // Restrict to cashier's own data if not admin
    // if (req.user.role === "cashier") {
    //   filter.cashierId = req.user.id;
    // }

    const summary = await CashierShiftSummary.findOne(filter).populate(
      "cashierId",
      "name email role"
    );

    if (!summary) {
      return res.status(404).json({ error: "No summary found for this date" });
    }

    res.json(summary);
  } catch (err) {
    console.error("Failed to load shift summary:", err.message);
    res.status(500).json({ error: "Failed to load summary" });
  }
};