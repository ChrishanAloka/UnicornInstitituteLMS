// src/controllers/ActivityItemsMarkProgressController.js
const Level4Activity = require('../models/Level4Activity');
const Level5ActivityItem = require('../models/Level5ActivityItem');
const ActivityItemsMarkProgress = require('../models/ActivityItemsMarkProgress');

// Helper: Get current total progress for an item
const getCurrentProgress = async (itemId) => {
  const progressEntries = await ActivityItemsMarkProgress.find({ activityItem: itemId }).lean();
  const totalPhysical = progressEntries.reduce((sum, p) => sum + (p.physicalProgressPercentage || 0), 0);
  const totalFinancial = progressEntries.reduce((sum, p) => sum + (p.financialProgressPercentage || 0), 0);
  return { totalPhysical, totalFinancial, count: progressEntries.length };
};

// POST /api/auth/activityitemsmarkprogress
exports.markProgress = async (req, res) => {
  const {
    activityItem,
    level4Activity,     // 👈 Now expected from frontend
    level3Component,    // 👈 Now expected from frontend
    fromDate,
    toDate,
    physicalProgressDescription,
    physicalProgressPercentage,
    financialProgressAmount,
    financialProgressPercentage
  } = req.body;

  console.log("activityItem ",activityItem, " level4Activity ",level4Activity, " level3Component ",level3Component);

  // Validation
  if (
    !activityItem ||
    !level4Activity ||
    !level3Component ||
    !fromDate ||
    !toDate ||
    physicalProgressPercentage == null ||
    financialProgressPercentage == null ||
    financialProgressAmount == null
  ) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const physicalPct = Number(physicalProgressPercentage);
  const financialPct = Number(financialProgressPercentage);
  const financialAmt = Number(financialProgressAmount);

  if (isNaN(physicalPct) || physicalPct <= 0 || physicalPct > 100) {
    return res.status(400).json({ error: 'Physical progress must be between 0 and 100' });
  }
  if (isNaN(financialPct) || financialPct <= 0 || financialPct > 100) {
    return res.status(400).json({ error: 'Financial progress % must be between 0 and 100' });
  }
  if (isNaN(financialAmt) || financialAmt < 0) {
    return res.status(400).json({ error: 'Financial amount must be a non-negative number' });
  }

  if (new Date(toDate) < new Date(fromDate)) {
    return res.status(400).json({ error: 'To date must be after or equal to from date' });
  }

  try {
    // 🔍 Validate Level 5 item exists and matches the hierarchy
    const item = await Level5ActivityItem.findById(activityItem);
    if (!item) {
      return res.status(404).json({ error: 'Level 5 item not found' });
    }

    // Optional: Double-check that the provided IDs match the actual hierarchy
    // (Good for security if users could manipulate requests)
    // ✅ Safe: Check existence before .toString()
    if (!item.parentItem) {
    return res.status(400).json({ error: 'Level 5 item has no parent Level 4 activity' });
    }

    if (item.parentItem.toString() !== level4Activity) {
    return res.status(400).json({ error: 'Level 5 item does not belong to the selected Level 4 activity' });
    }

    const level4 = await Level4Activity.findById(level4Activity);
    if (!level4) {
    return res.status(400).json({ error: 'Selected Level 4 activity not found' });
    }

    if (!level4.parentActivity) {
    return res.status(400).json({ error: 'Level 4 activity has no parent Level 3 component' });
    }

    if (level4.parentActivity.toString() !== level3Component) {
    return res.status(400).json({ error: 'Level 4 activity does not belong to the selected Level 3 component' });
    }

    // Optional: Validate financial amount ≤ item budget
    if (financialAmt > item.estimatedAmount) {
      return res.status(400).json({
        error: `Financial amount ($${financialAmt}) exceeds item's total budget ($${item.estimatedAmount})`
      });
    }

    // Check cumulative progress
    const existingEntries = await ActivityItemsMarkProgress.find({ activityItem }).lean();
    const totalPhysical = existingEntries.reduce((sum, p) => sum + (p.physicalProgressPercentage || 0), 0);
    const totalFinancial = existingEntries.reduce((sum, p) => sum + (p.financialProgressPercentage || 0), 0);

    if (totalPhysical + physicalPct > 100) {
      return res.status(400).json({
        error: `Physical progress would exceed 100%. Current: ${totalPhysical}%, Adding: ${physicalPct}%`
      });
    }
    if (totalFinancial + financialPct > 100) {
      return res.status(400).json({
        error: `Financial progress would exceed 100%. Current: ${totalFinancial}%, Adding: ${financialPct}%`
      });
    }

    // ✅ Save with explicitly provided hierarchy IDs
    const newProgress = new ActivityItemsMarkProgress({
      activityItem,
      level4Activity,
      level3Component,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      physicalProgressDescription: physicalProgressDescription || "",
      physicalProgressPercentage: physicalPct,
      financialProgressAmount: financialAmt,
      financialProgressPercentage: financialPct
    });

    const saved = await newProgress.save();

    // Use Model.populate (static method)
    const populated = await ActivityItemsMarkProgress.populate(saved, [
    { path: 'activityItem', select: 'code itemName' },
    { path: 'level4Activity', select: 'code activityName' },
    { path: 'level3Component', select: 'code componentName' }
    ]);

    res.status(201).json(populated);
  } catch (err) {
    console.error('Failed to mark progress:', err.message);
    res.status(500).json({ error: 'Failed to record progress' });
  }
};

// GET /api/auth/activityitemsmarkprogress/by-item/:itemId
exports.getProgressByItem = async (req, res) => {
  const { itemId } = req.params;
  try {
    const progressEntries = await ActivityItemsMarkProgress.find({ activityItem: itemId })
        .populate('activityItem', 'code itemName')
        .populate('level4Activity', 'code activityName')
        .populate('level3Component', 'code componentName')
        .sort({ fromDate: 1 });

    // Also return current totals
    const { totalPhysical, totalFinancial } = await getCurrentProgress(itemId);

    res.json({
      entries: progressEntries,
      summary: {
        totalPhysicalProgress: parseFloat(totalPhysical.toFixed(2)),
        totalFinancialProgress: parseFloat(totalFinancial.toFixed(2)),
        completed: totalPhysical >= 100 && totalFinancial >= 100
      }
    });
  } catch (err) {
    console.error('Failed to load progress:', err.message);
    res.status(500).json({ error: 'Failed to load progress data' });
  }
};

// GET /api/auth/activityitemsmarkprogress — all (optional, for admin)
exports.getAllProgress = async (req, res) => {
  try {
    const all = await ActivityItemsMarkProgress.find()
        .populate('activityItem', 'code itemName')
        .populate('level4Activity', 'code activityName')
        .populate('level3Component', 'code componentName')
        .sort({ createdAt: -1 });
    res.json(all);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load progress records' });
  }
};