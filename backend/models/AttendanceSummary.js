const mongoose = require('mongoose');

const attendanceSummarySchema = new mongoose.Schema({
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
  month: {
    type: Number,
    required: true,
    min: 0,
    max: 11
  },
  year: {
    type: Number,
    required: true
  },
  totalSessions: {
    type: Number,
    required: true,
    default: 0
  },
  attendedSessions: {
    type: Number,
    required: true,
    default: 0
  },
  absentSessions: {
    type: Number,
    required: true,
    default: 0
  },
  attendancePercentage: {
    type: Number,
    required: true,
    default: 0
  },
  details: {
    regularSessions: Number,
    extraSessions: Number,
    absentSessions: Number,
    rescheduledSessions: Number
  }
}, { timestamps: true });

attendanceSummarySchema.index({ student: 1, course: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceSummary', attendanceSummarySchema);