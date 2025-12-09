// src/controllers/level3ComponentController.js
const Level2Component = require('../models/Level2Component');
const Level3Component = require('../models/Level3Component');

// GET /api/project/level3
exports.getComponents = async (req, res) => {
  try {
    const components = await Level3Component.find()
      .populate('parentComponent', 'code componentName estimatedAmount')
      .sort({ createdAt: -1 });
    res.json(components);
  } catch (err) {
    console.error('Failed to load Level 3 components:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/project/level3/parents — Returns Level 2 components with usage/remaining
exports.getParentComponents = async (req, res) => {
  try {
    const level2List = await Level2Component.find().lean();
    const level3List = await Level3Component.find({}).lean();

    const allocationMap = {};
    level3List.forEach(sub => {
      const parentId = sub.parentComponent.toString();
      allocationMap[parentId] = (allocationMap[parentId] || 0) + (sub.estimatedAmount || 0);
    });

    const enrichedParents = level2List.map(parent => {
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
    console.error('Failed to load Level 2 parent components:', err.message);
    res.status(500).json({ error: 'Failed to load Level 2 components' });
  }
};

// POST /api/project/level3
exports.createComponent = async (req, res) => {
  const { code, componentName, componentDescription, estimatedAmount, parentComponent } = req.body;

  if (!code || !componentName || !parentComponent || estimatedAmount == null) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const amountNum = Number(estimatedAmount);
  if (isNaN(amountNum) || amountNum < 0) {
    return res.status(400).json({ error: 'Valid non-negative estimated amount is required' });
  }

  try {
    const parent = await Level2Component.findById(parentComponent);
    if (!parent) {
      return res.status(404).json({ error: 'Parent Level 2 component not found' });
    }

    const allocated = await Level3Component.aggregate([
      { $match: { parentComponent: parent._id } },
      { $group: { _id: null, total: { $sum: '$estimatedAmount' } } }
    ]);

    const totalUsed = allocated.length > 0 ? allocated[0].total : 0;
    const newTotal = totalUsed + amountNum;

    if (newTotal > parent.estimatedAmount) {
      return res.status(400).json({
        error: `Total allocation ($${newTotal.toFixed(2)}) exceeds parent's budget of $${parent.estimatedAmount.toFixed(2)}`
      });
    }

    const newComponent = new Level3Component({
      code,
      componentName,
      componentDescription,
      estimatedAmount: amountNum,
      parentComponent
    });

    const saved = await newComponent.save();
    const populated = await saved.populate('parentComponent', 'code componentName estimatedAmount');
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Component code must be unique' });
    }
    console.error('Failed to add Level 3 component:', err.message);
    res.status(500).json({ error: 'Failed to add component' });
  }
};

// PUT /api/project/level3/:id
exports.updateComponent = async (req, res) => {
  const { id } = req.params;
  const { code, componentName, componentDescription, estimatedAmount, parentComponent } = req.body;

  if (!code || !componentName || !parentComponent || estimatedAmount == null) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const amountNum = Number(estimatedAmount);
  if (isNaN(amountNum) || amountNum < 0) {
    return res.status(400).json({ error: 'Valid non-negative estimated amount is required' });
  }

  try {
    const existing = await Level3Component.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Level 3 component not found' });
    }

    const oldParentId = existing.parentComponent.toString();
    const newParentId = parentComponent;

    const newParent = await Level2Component.findById(newParentId);
    if (!newParent) {
      return res.status(404).json({ error: 'New parent Level 2 component not found' });
    }

    let totalUsed = 0;
    if (oldParentId === newParentId) {
      const allocated = await Level3Component.aggregate([
        { $match: { parentComponent: newParentId, _id: { $ne: id } } },
        { $group: { _id: null, total: { $sum: '$estimatedAmount' } } }
      ]);
      totalUsed = (allocated[0]?.total || 0) + amountNum;
    } else {
      const allocated = await Level3Component.aggregate([
        { $match: { parentComponent: newParentId } },
        { $group: { _id: null, total: { $sum: '$estimatedAmount' } } }
      ]);
      totalUsed = (allocated[0]?.total || 0) + amountNum;
    }

    if (totalUsed > newParent.estimatedAmount) {
      return res.status(400).json({
        error: `Total allocation ($${totalUsed.toFixed(2)}) exceeds new parent's budget of $${newParent.estimatedAmount.toFixed(2)}`
      });
    }

    const updated = await Level3Component.findByIdAndUpdate(
      id,
      {
        code,
        componentName,
        componentDescription,
        estimatedAmount: amountNum,
        parentComponent: newParentId
      },
      { new: true, runValidators: true }
    ).populate('parentComponent', 'code componentName estimatedAmount');

    if (!updated) {
      return res.status(404).json({ error: 'Update failed' });
    }

    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Component code must be unique' });
    }
    console.error('Failed to update Level 3 component:', err.message);
    res.status(500).json({ error: 'Failed to update component' });
  }
};

// DELETE /api/project/level3/:id
exports.deleteComponent = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Level3Component.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Component not found' });
    }
    res.json({ message: 'Level 3 component deleted successfully' });
  } catch (err) {
    console.error('Failed to delete Level 3 component:', err.message);
    res.status(500).json({ error: 'Failed to delete component' });
  }
};