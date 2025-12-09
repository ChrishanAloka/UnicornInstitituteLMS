const Salary = require("../models/Salary");
const Employee = require("../models/Employee");

exports.addSalary = async (req, res) => {
  const { employee, basicSalary, otHours, otRate } = req.body;

  if (!employee || !basicSalary) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const emp = await Employee.findById(employee);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const otAmount = otHours * otRate;
    const total = basicSalary + otAmount;

    const newSalary = new Salary({
      employee,
      basicSalary,
      otHours: otHours || 0,
      otRate: otRate || 0,
      total
    });

    await newSalary.save();
    res.json(newSalary);
  } catch (err) {
    console.error("Add salary failed:", err.message);
    res.status(500).json({ error: "Failed to add salary" });
  }
};

exports.getAllSalaries = async (req, res) => {
  try {
    const salaries = await Salary.find({}).populate("employee");
    res.json(salaries);
  } catch (err) {
    res.status(500).json({ error: "Failed to load salaries" });
  }
};