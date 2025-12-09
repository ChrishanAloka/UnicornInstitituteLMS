const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseName: { type: String, required: true, trim: true },
  courseDate: { type: Date, required: true },
  timeFrom: { type: String, required: true }, // e.g., "10:00"
  timeTo: { type: String, required: true },   // e.g., "12:00"
  description: { type: String, trim: true },
  courseType: {
    type: String,
    default: 'weekly'
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Instructor'
  }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);