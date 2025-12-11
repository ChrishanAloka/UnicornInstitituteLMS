const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseName: { type: String, required: true, trim: true },
  dayOfWeek: { 
    type: String, 
    required: true,
  },
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
  },
  // ✅ NEW FIELDS
  courseStartDate: { type: Date }, // required only if courseType === "other"
  courseEndDate: { type: Date },   // optional
  courseFees: { type: Number }     // optional (you can make required if needed)
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);