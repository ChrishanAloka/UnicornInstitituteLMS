const mongoose = require('mongoose');

const absentDaySchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  absentDate: {
    type: Date,
    required: true,
    // This is a date that matches course's dayOfWeek but will be skipped
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

// Ensure only one absent day per date per course
absentDaySchema.index({ course: 1, absentDate: 1 }, { unique: true });
absentDaySchema.index({ absentDate: 1 });

module.exports = mongoose.model('AbsentDay', absentDaySchema);