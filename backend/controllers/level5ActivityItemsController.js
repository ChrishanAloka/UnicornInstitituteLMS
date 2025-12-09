// src/controllers/level5ActivityItemsController.js
const Level4Activity = require('../models/Level4Activity');
const Level5ActivityItem = require('../models/Level5ActivityItem');

// GET /api/auth/level5activityitem
exports.getItems = async (req, res) => {
  try {
    const items = await Level5ActivityItem.find()
      .populate('parentItem', 'code activityName estimatedAmount')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error('Failed to load Level 5 items:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/auth/level5activityitem/parents — Returns Level 4 activities with usage & remaining
exports.getParentItems = async (req, res) => {
  try {
    const level4List = await Level4Activity.find().lean();
    const level5List = await Level5ActivityItem.find({}).lean();

    const allocationMap = {};
    level5List.forEach(sub => {
      const parentId = sub.parentItem.toString();
      allocationMap[parentId] = (allocationMap[parentId] || 0) + (sub.estimatedAmount || 0);
    });

    const enrichedParents = level4List.map(parent => {
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
    console.error('Failed to load Level 4 parent items:', err.message);
    res.status(500).json({ error: 'Failed to load Level 4 activities' });
  }
};

// GET /api/auth/level5activityitem/:id
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Level5ActivityItem.findById(id)
      .populate('parentItem', 'code activityName estimatedAmount');

    if (!item) {
      return res.status(404).json({ error: 'Level 5 item not found' });
    }

    res.json(item);
  } catch (err) {
    console.error('Failed to fetch Level 5 item by ID:', err.message);
    res.status(500).json({ error: 'Failed to load item details' });
  }
};

// POST /api/auth/level5activityitem
exports.createItem = async (req, res) => {
  const { code, itemName, itemDescription, estimatedAmount, parentItem, unit, parameter, institute } = req.body;

  if (!code || !itemName || !parentItem || estimatedAmount == null) {
    return res.status(400).json({ error: 'Code, Item Name, Parent, and Estimated Amount are required' });
  }

  const amountNum = Number(estimatedAmount);
  if (isNaN(amountNum) || amountNum < 0) {
    return res.status(400).json({ error: 'Valid non-negative estimated amount is required' });
  }

  try {
    const parent = await Level4Activity.findById(parentItem);
    if (!parent) {
      return res.status(404).json({ error: 'Parent Level 4 activity not found' });
    }

    const allocated = await Level5ActivityItem.aggregate([
      { $match: { parentItem: parent._id } },
      { $group: { _id: null, total: { $sum: '$estimatedAmount' } } }
    ]);

    const totalUsed = allocated.length > 0 ? allocated[0].total : 0;
    const newTotal = totalUsed + amountNum;

    if (newTotal > parent.estimatedAmount) {
      return res.status(400).json({
        error: `Total allocation ($${newTotal.toFixed(2)}) exceeds parent's budget of $${parent.estimatedAmount.toFixed(2)}`
      });
    }

    const newItem = new Level5ActivityItem({
      code,
      itemName,
      itemDescription,
      estimatedAmount: amountNum,
      unit: unit || "",
      parameter: parameter || "",
      institute: institute || "",
      parentItem
    });

    const saved = await newItem.save();
    const populated = await saved.populate('parentItem', 'code activityName estimatedAmount');
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Item code must be unique' });
    }
    console.error('Failed to add Level 5 item:', err.message);
    res.status(500).json({ error: 'Failed to add item' });
  }
};

// PUT /api/auth/level5activityitem/:id
exports.updateItem = async (req, res) => {
  const { id } = req.params;
  const { code, itemName, itemDescription, estimatedAmount, parentItem, unit, parameter, institute } = req.body;

  if (!code || !itemName || !parentItem || estimatedAmount == null) {
    return res.status(400).json({ error: 'Code, Item Name, Parent, and Estimated Amount are required' });
  }

  const amountNum = Number(estimatedAmount);
  if (isNaN(amountNum) || amountNum < 0) {
    return res.status(400).json({ error: 'Valid non-negative estimated amount is required' });
  }

  try {
    const existing = await Level5ActivityItem.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Level 5 item not found' });
    }

    const oldParentId = existing.parentItem.toString();
    const newParentId = parentItem;

    const newParent = await Level4Activity.findById(newParentId);
    if (!newParent) {
      return res.status(404).json({ error: 'New parent Level 4 activity not found' });
    }

    let totalUsed = 0;
    if (oldParentId === newParentId) {
      const allocated = await Level5ActivityItem.aggregate([
        { $match: { parentItem: newParentId, _id: { $ne: id } } },
        { $group: { _id: null, total: { $sum: '$estimatedAmount' } } }
      ]);
      totalUsed = (allocated[0]?.total || 0) + amountNum;
    } else {
      const allocated = await Level5ActivityItem.aggregate([
        { $match: { parentItem: newParentId } },
        { $group: { _id: null, total: { $sum: '$estimatedAmount' } } }
      ]);
      totalUsed = (allocated[0]?.total || 0) + amountNum;
    }

    if (totalUsed > newParent.estimatedAmount) {
      return res.status(400).json({
        error: `Total allocation ($${totalUsed.toFixed(2)}) exceeds new parent's budget of $${newParent.estimatedAmount.toFixed(2)}`
      });
    }

    const updated = await Level5ActivityItem.findByIdAndUpdate(
      id,
      {
        code,
        itemName,
        itemDescription,
        estimatedAmount: amountNum,
        unit: unit || "",
        parameter: parameter || "",
        institute: institute || "",
        parentItem: newParentId
      },
      { new: true, runValidators: true }
    ).populate('parentItem', 'code activityName estimatedAmount');

    if (!updated) {
      return res.status(404).json({ error: 'Update failed' });
    }

    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Item code must be unique' });
    }
    console.error('Failed to update Level 5 item:', err.message);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

// DELETE /api/auth/level5activityitem/:id
exports.deleteItem = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Level5ActivityItem.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Level 5 item deleted successfully' });
  } catch (err) {
    console.error('Failed to delete Level 5 item:', err.message);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};