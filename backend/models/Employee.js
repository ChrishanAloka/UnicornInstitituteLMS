const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    nic: {
      type: String,
      required: true,
      unique: true
    },
    address: String,
    phone: {
      type: String,
      required: true
    },
    basicSalary: {
      type: Number,
      required: true
    },
    workingHours: {
      type: Number,
      default: 8
    },
    otHourRate: {
      type: Number,
      default: 0
    },
    bankAccountNo: String,
    role: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Employee", employeeSchema);