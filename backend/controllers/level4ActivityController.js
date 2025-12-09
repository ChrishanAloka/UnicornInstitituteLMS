// src/controllers/level4ActivityController.js
const Level3Component = require('../models/Level3Component');
const Level4Activity = require('../models/Level4Activity');

// GET /api/auth/level4activity
exports.getActivities = async (req, res) => {
  try {
    const activities = await Level4Activity.find()
      .populate('parentActivity', 'code componentName estimatedAmount')
      .sort({ createdAt: -1 });
    res.json(activities);
  } catch (err) {
    console.error('Failed to load Level 4 activities:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/auth/level4activity/parents — Returns Level 3 components with usage & remaining
exports.getParentActivities = async (req, res) => {
  try {
    const level3List = await Level3Component.find().lean();
    const level4List = await Level4Activity.find({}).lean();

    const allocationMap = {};
    level4List.forEach(sub => {
      const parentId = sub.parentActivity.toString();
      allocationMap[parentId] = (allocationMap[parentId] || 0) + (sub.estimatedAmount || 0);
    });

    const enrichedParents = level3List.map(parent => {
      const parentId = parent._id.toString();
      const usedAmount = allocationMap[parentId] || 0;
      const remainingAmount = Math.max(0, (parent.estimatedAmount || 0) - usedAmount);
      return {
        ...parent,
        usedAmount,
        remainingAmount
      };
    });

    res.json(enrichedParents);
  } catch (err) {
    console.error('Failed to load Level 3 parent activities:', err.message);
    res.status(500).json({ error: 'Failed to load Level 3 components' });
  }
};

// POST /api/auth/level4activity
exports.createActivity = async (req, res) => {
  const { code, activityName, activityDescription, estimatedAmount, parentActivity } = req.body;

  if (!code || !activityName || !parentActivity || estimatedAmount == null) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const amountNum = Number(estimatedAmount);
  if (isNaN(amountNum) || amountNum < 0) {
    return res.status(400).json({ error: 'Valid non-negative estimated amount is required' });
  }

  try {
    const parent = await Level3Component.findById(parentActivity);
    if (!parent) {
      return res.status(404).json({ error: 'Parent Level 3 activity not found' });
    }

    const allocated = await Level4Activity.aggregate([
      { $match: { parentActivity: parent._id } },
      { $group: { _id: null, total: { $sum: '$estimatedAmount' } } }
    ]);

    const totalUsed = allocated.length > 0 ? allocated[0].total : 0;
    const newTotal = totalUsed + amountNum;

    if (newTotal > parent.estimatedAmount) {
      return res.status(400).json({
        error: `Total allocation ($${newTotal.toFixed(2)}) exceeds parent's budget of $${parent.estimatedAmount.toFixed(2)}`
      });
    }

    const newActivity = new Level4Activity({
      code,
      activityName,
      activityDescription,
      estimatedAmount: amountNum,
      parentActivity
    });

    const saved = await newActivity.save();
    const populated = await saved.populate('parentActivity', 'code componentName estimatedAmount');
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Activity code must be unique' });
    }
    console.error('Failed to add Level 4 activity:', err.message);
    res.status(500).json({ error: 'Failed to add activity' });
  }
};

// PUT /api/auth/level4activity/:id
exports.updateActivity = async (req, res) => {
  const { id } = req.params;
  const { code, activityName, activityDescription, estimatedAmount, parentActivity } = req.body;

  if (!code || !activityName || !parentActivity || estimatedAmount == null) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const amountNum = Number(estimatedAmount);
  if (isNaN(amountNum) || amountNum < 0) {
    return res.status(400).json({ error: 'Valid non-negative estimated amount is required' });
  }

  try {
    const existing = await Level4Activity.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Level 4 activity not found' });
    }

    const oldParentId = existing.parentActivity.toString();
    const newParentId = parentActivity;

    const newParent = await Level3Component.findById(newParentId);
    if (!newParent) {
      return res.status(404).json({ error: 'New parent Level 3 activity not found' });
    }

    let totalUsed = 0;
    if (oldParentId === newParentId) {
      const allocated = await Level4Activity.aggregate([
        { $match: { parentActivity: newParentId, _id: { $ne: id } } },
        { $group: { _id: null, total: { $sum: '$estimatedAmount' } } }
      ]);
      totalUsed = (allocated[0]?.total || 0) + amountNum;
    } else {
      const allocated = await Level4Activity.aggregate([
        { $match: { parentActivity: newParentId } },
        { $group: { _id: null, total: { $sum: '$estimatedAmount' } } }
      ]);
      totalUsed = (allocated[0]?.total || 0) + amountNum;
    }

    if (totalUsed > newParent.estimatedAmount) {
      return res.status(400).json({
        error: `Total allocation ($${totalUsed.toFixed(2)}) exceeds new parent's budget of $${newParent.estimatedAmount.toFixed(2)}`
      });
    }

    const updated = await Level4Activity.findByIdAndUpdate(
      id,
      {
        code,
        activityName,
        activityDescription,
        estimatedAmount: amountNum,
        parentActivity: newParentId
      },
      { new: true, runValidators: true }
    ).populate('parentActivity', 'code componentName estimatedAmount');

    if (!updated) {
      return res.status(404).json({ error: 'Update failed' });
    }

    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Activity code must be unique' });
    }
    console.error('Failed to update Level 4 activity:', err.message);
    res.status(500).json({ error: 'Failed to update activity' });
  }
};

// DELETE /api/auth/level4activity/:id
exports.deleteActivity = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Level4Activity.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json({ message: 'Level 4 activity deleted successfully' });
  } catch (err) {
    console.error('Failed to delete Level 4 activity:', err.message);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
};