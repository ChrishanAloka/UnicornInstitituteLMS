const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
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
  date: { type: Date, required: true, default: Date.now },
  status: { 
    type: String, 
    default: 'present' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);