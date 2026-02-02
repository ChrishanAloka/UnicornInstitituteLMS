// models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    trim: true
  },
  // Name fields
  title: {
    type: String,
    enum: ['Mr.', 'Ms.', 'Mrs.', 'Master', 'Miss', 'Dr.', 'Prof.', 'Rev.', ''],
    default: '',
    trim: true
  },
  initials: {
    type: String,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  secondName: {
    type: String,
    trim: true
  },
  surname: {
    type: String,
    required: true,
    trim: true
  },
  // Full name (computed or stored for backward compatibility)
  name: {
    type: String,
    required: false, // Not required since it's auto-generated
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
  // >>> NEW FIELDS <<<
  email: { type: String, trim: true }, // optional
  guardianName: { type: String, required: true, trim: true },
  guardianPhoneNo: { type: String, required: true, trim: true },
  nicNumber: { type: String, trim: true }, // optional
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

// Pre-save hook to automatically construct full name from components
// This needs to run BEFORE validation
studentSchema.pre('validate', function(next) {
  // Always construct the name from components
  const parts = [];
  
  if (this.title) parts.push(this.title);
  if (this.initials) parts.push(this.initials);
  if (this.firstName) parts.push(this.firstName);
  if (this.secondName) parts.push(this.secondName);
  if (this.surname) parts.push(this.surname);
  
  this.name = parts.join(' ');
  next();
});

module.exports = mongoose.model('Student', studentSchema);