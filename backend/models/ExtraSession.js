const mongoose = require('mongoose');

const extraSessionSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  extraDate: {
    type: Date,
    required: true,
    // One-off session date (doesn't need to match course dayOfWeek)
  },
  startTime: {
    type: String,
    required: true,
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid start time format (HH:mm)'],
    // e.g., "09:00"
  },
  endTime: {
    type: String,
    required: true,
    match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid end time format (HH:mm)'],
    // e.g., "10:30"
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

// Ensure only one extra session per date per course
extraSessionSchema.index({ course: 1, extraDate: 1 }, { unique: true });
extraSessionSchema.index({ extraDate: 1 });

module.exports = mongoose.model('ExtraSession', extraSessionSchema);