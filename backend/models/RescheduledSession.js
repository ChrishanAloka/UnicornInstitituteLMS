// models/RescheduledSession.js
const mongoose = require('mongoose');

const rescheduledSessionSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  originalDate: {
    type: Date,
    required: true,
    // This is the date that would have been scheduled based on dayOfWeek
  },
  newDate: {
    type: Date,
    required: true,
    // The actual date the class will happen
  },
  reason: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Ensure only one reschedule per originalDate per course
rescheduledSessionSchema.index({ course: 1, originalDate: 1 }, { unique: true });
rescheduledSessionSchema.index({ newDate: 1 });

module.exports = mongoose.model('RescheduledSession', rescheduledSessionSchema);