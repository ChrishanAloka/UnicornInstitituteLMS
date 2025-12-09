const Employee = require("../models/Employee");

// Helper to generate next EMP-ID
async function generateNextId() {
  try {
    const lastEmp = await Employee.findOne({})
      .sort({ _id: -1 })
      .limit(1);

    if (!lastEmp || !lastEmp.id) {
      return "EMP-001"; // First employee
    }

    const lastNumber = parseInt(lastEmp.id.slice(4)); // Get number after EMP-
    const nextNumber = lastNumber + 1;
    return `EMP-${String(nextNumber).padStart(3, "0")}`;
  } catch (err) {
    console.error("Failed to generate ID:", err.message);
    return "EMP-001";
  }
}

// Register new employee
exports.registerEmployee = async (req, res) => {
  const {
    name,
    nic,
    address,
    phone,
    basicSalary,
    workingHours,
    otHourRate,
    bankAccountNo,
    role
  } = req.body;

  if (!name || !nic || !phone || !basicSalary || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const existingNIC = await Employee.findOne({ nic });
    if (existingNIC) {
      return res.status(400).json({ error: "NIC already registered" });
    }

    const newId = await generateNextId(); // ✅ Use helper

    const newEmployee = new Employee({
      id: newId,
      name,
      nic,
      address,
      phone,
      basicSalary,
      workingHours: workingHours || 8,
      otHourRate: otHourRate || 0,
      bankAccountNo,
      role
    });

    await newEmployee.save();
    res.json(newEmployee);
  } catch (err) {
    console.error("Register failed:", err.message);
    res.status(500).json({ error: "Failed to register employee" });
  }
};

// GET /api/auth/employees/next-id
exports.getNextId = async (req, res) => {
  try {
    const lastEmp = await Employee.findOne({})
      .sort({ _id: -1 })
      .limit(1);

    let nextNumber = 1;
    if (lastEmp && lastEmp.employeeId) {
      nextNumber = parseInt(lastEmp.employeeId.slice(4)) + 1;
    }

    const nextId = `EMP-${String(nextNumber).padStart(3, "0")}`;
    res.json({ nextId });
  } catch (err) {
    res.status(500).json({ error: "Failed to load next ID" });
  }
};

// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({});
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: "Failed to load employees" });
  }
};

// Get one employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: "Failed to load employee" });
  }
};

// Update employee
exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const updated = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updated) {
      return res.status(404).json({ error: "Employee not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update failed:", err.message);
    res.status(500).json({ error: "Failed to update employee" });
  }
};

// Delete employee
exports.deleteEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await Employee.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error("Delete failed:", err.message);
    res.status(500).json({ error: "Failed to delete employee" });
  }
};