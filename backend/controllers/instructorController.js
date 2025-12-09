const Instructor = require('../models/Instructor');

exports.registerInstructor = async (req, res) => {
  try {
    const { name, phoneNo, address } = req.body;
    const ins = new Instructor({ name, phoneNo, address });
    await ins.save();
    res.status(201).json(ins);
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.getInstructors = async (req, res) => {
  try {
    const list = await Instructor.find();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
};

exports.updateInstructor = async (req, res) => {
  try {
    const updated = await Instructor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
};

exports.deleteInstructor = async (req, res) => {
  try {
    const deleted = await Instructor.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};