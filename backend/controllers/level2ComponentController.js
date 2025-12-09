// src/controllers/level2ComponentController.js
const Level1Component = require('../models/Level1Component');
const Level2Component = require('../models/Level2Component');

// GET /api/project/level2
exports.getComponents = async (req, res) => {
  try {
    // Populate parent component for display
    const components = await Level2Component.find()
      .populate('parentComponent', 'code componentName estimatedAmount')
      .sort({ createdAt: -1 });
    res.json(components);
  } catch (err) {
    console.error('Failed to load Level 2 components:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/project/level2/parents — Returns Level 1 components with usage/remaining
exports.getParentComponents = async (req, res) => {
  try {
    const level1List = await Level1Component.find().lean();
    const level2List = await Level2Component.find({}).lean();

    // Build a map: parent ID → total allocated amount
    const allocationMap = {};
    level2List.forEach(sub => {
      const parentId = sub.parentComponent.toString();
      allocationMap[parentId] = (allocationMap[parentId] || 0) + (sub.estimatedAmount || 0);
    });

    // Enrich each Level 1 with used & remaining
    const enrichedParents = level1List.map(parent => {
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
    console.error('Failed to load parent components:', err.message);
    res.status(500).json({ error: 'Failed to load Level 1 components' });
  }
};

// POST /api/project/level2
exports.createComponent = async (req, res) => {
  const { code, componentName, componentDescription, estimatedAmount, parentComponent } = req.body;

  // Basic validation
  if (!code || !componentName || !parentComponent || estimatedAmount == null) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const amountNum = Number(estimatedAmount);
  if (isNaN(amountNum) || amountNum < 0) {
    return res.status(400).json({ error: 'Valid non-negative estimated amount is required' });
  }

  try {
    // Fetch parent to check balance
    const parent = await Level1Component.findById(parentComponent);
    if (!parent) {
      return res.status(404).json({ error: 'Parent Level 1 component not found' });
    }

    // Calculate current allocation under this parent
    const allocated = await Level2Component.aggregate([
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

    // Create new Level 2 component
    const newComponent = new Level2Component({
      code,
      componentName,
      componentDescription,
      estimatedAmount: amountNum,
      parentComponent
    });

    const saved = await newComponent.save();
    // Populate parent for consistent response
    const populated = await saved.populate('parentComponent', 'code componentName');
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Component code must be unique' });
    }
    console.error('Failed to add Level 2 component:', err.message);
    res.status(500).json({ error: 'Failed to add component' });
  }
};

// PUT /api/project/level2/:id
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
    const existing = await Level2Component.findById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Component not found' });
    }

    const oldParentId = existing.parentComponent.toString();
    const newParentId = parentComponent;

    // Fetch new parent
    const newParent = await Level1Component.findById(newParentId);
    if (!newParent) {
      return res.status(404).json({ error: 'New parent Level 1 component not found' });
    }

    // Calculate used amount under NEW parent (excluding current record if parent unchanged)
    let totalUsed = 0;
    if (oldParentId === newParentId) {
      // Same parent: subtract old amount, add new
      const allocated = await Level2Component.aggregate([
        { $match: { parentComponent: newParentId, _id: { $ne: id } } },
        { $group: { _id: null, total: { $sum: '$estimatedAmount' } } }
      ]);
      totalUsed = (allocated[0]?.total || 0) + amountNum;
    } else {
      // Different parent: full sum under new parent
      const allocated = await Level2Component.aggregate([
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

    // Perform update
    const updated = await Level2Component.findByIdAndUpdate(
      id,
      {
        code,
        componentName,
        componentDescription,
        estimatedAmount: amountNum,
        parentComponent: newParentId
      },
      { new: true, runValidators: true }
    ).populate('parentComponent', 'code componentName');

    if (!updated) {
      return res.status(404).json({ error: 'Update failed: component not found' });
    }

    res.json(updated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Component code must be unique' });
    }
    console.error('Failed to update Level 2 component:', err.message);
    res.status(500).json({ error: 'Failed to update component' });
  }
};

// DELETE /api/project/level2/:id
exports.deleteComponent = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Level2Component.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Component not found' });
    }
    res.json({ message: 'Level 2 component deleted successfully' });
  } catch (err) {
    console.error('Failed to delete Level 2 component:', err.message);
    res.status(500).json({ error: 'Failed to delete component' });
  }
};