const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  basicSalary: { type: Number, required: true },
  otHours: { type: Number, default: 0 },
  otRate: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Salary", salarySchema);