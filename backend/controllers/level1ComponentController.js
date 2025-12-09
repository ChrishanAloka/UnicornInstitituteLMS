// src/controllers/level1ComponentController.js
const Level1Component = require("../models/Level1Component");

// GET /api/project/components
exports.getComponents = async (req, res) => {
  try {
    const components = await Level1Component.find().sort({ createdAt: -1 });
    res.json(components);
  } catch (err) {
    console.error("Failed to load components:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/project/components
exports.createComponent = async (req, res) => {
  const { code, componentName, componentDescription, estimatedAmount } = req.body;

  if (!code || !componentName) {
    return res.status(400).json({ error: "Component Code and Name are required" });
  }

  try {
    const newComponent = new Level1Component({
      code,
      componentName,
      componentDescription,
      estimatedAmount: estimatedAmount ? Number(estimatedAmount) : 0
    });

    const savedComponent = await newComponent.save();
    res.status(201).json(savedComponent);
  } catch (err) {
    console.error("Failed to add component:", err.message);
    res.status(500).json({ error: "Failed to add component" });
  }
};

// PUT /api/project/components/:id
exports.updateComponent = async (req, res) => {
  const { id } = req.params;
  const { code, componentName, componentDescription, estimatedAmount } = req.body;

  if (!code || !componentName) {
    return res.status(400).json({ error: "Component Code and Name are required" });
  }

  try {
    const updatedComponent = await Level1Component.findByIdAndUpdate(
      id,
      {
        code,
        componentName,
        componentDescription,
        estimatedAmount: estimatedAmount ? Number(estimatedAmount) : 0
      },
      { new: true, runValidators: true }
    );

    if (!updatedComponent) {
      return res.status(404).json({ error: "Component not found" });
    }

    res.json(updatedComponent);
  } catch (err) {
    console.error("Failed to update component:", err.message);
    res.status(500).json({ error: "Failed to update component" });
  }
};

// DELETE /api/project/components/:id
exports.deleteComponent = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedComponent = await Level1Component.findByIdAndDelete(id);

    if (!deletedComponent) {
      return res.status(404).json({ error: "Component not found" });
    }

    res.json({ message: "Component deleted successfully" });
  } catch (err) {
    console.error("Failed to delete component:", err.message);
    res.status(500).json({ error: "Failed to delete component" });
  }
};