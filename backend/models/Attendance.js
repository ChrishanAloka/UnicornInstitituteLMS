const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  punches: [
    {
      time: {
        type: String, // Format: "09:30 AM"
        required: true
      },
      type: {
        type: String,
        enum: ["In", "Break In", "Break Out", "Out"],
        required: true
      }
    }
  ]
});

module.exports = mongoose.model("Attendance", attendanceSchema);