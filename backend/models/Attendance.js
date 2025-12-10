// models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  // ✅ Custom student ID (e.g., "ID2026")
  studentId: {
    type: String,
    required: true,
    trim: true
  },
  // ✅ MongoDB reference to Student document
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    default: 'present'
  }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);