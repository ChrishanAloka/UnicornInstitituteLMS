// models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  birthday: {
    type: Date,
    required: true
  },
  address: {
    type: String,
    trim: true
  },
  school: {
    type: String,
    trim: true
  },
  currentGrade: {
    type: String,
    trim: true
  },
  phoneNo: {
    type: String,
    required: true,
    trim: true
  },
  // NEW: Enrolled courses with dates
  enrolledCourses: [{
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date } // optional
  }]
}, {
  timestamps: true // adds createdAt, updatedAt
});

module.exports = mongoose.model('Student', studentSchema);