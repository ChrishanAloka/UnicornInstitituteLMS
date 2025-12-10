// controllers/studentController.js
const Student = require('../models/Student');

// @desc    Register a new student
// @route   POST /api/auth/student/register
// @access  Private (admin or authorized user)
exports.registerStudent = async (req, res) => {
  try {
    const { studentId, name, birthday, address, school, currentGrade, phoneNo } = req.body;

    // Check if studentId already exists
    const existing = await Student.findOne({ studentId });
    if (existing) {
      return res.status(400).json({ error: 'Student ID already exists' });
    }

    const student = new Student({
      studentId,
      name,
      birthday,
      address,
      school,
      currentGrade,
      phoneNo
    });

    const saved = await student.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during student registration' });
  }
};

// @desc    Get all students
// @route   GET /api/auth/students
// @access  Private
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('enrolledCourses.course', 'courseName dayOfWeek timeFrom timeTo');
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json(student);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
};

// @desc    Update a student
// @route   PUT /api/auth/student/:id
// @access  Private
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, name, birthday, address, school, currentGrade, phoneNo } = req.body;

    // Prevent duplicate studentId from another record
    const existing = await Student.findOne({ studentId, _id: { $ne: id } });
    if (existing) {
      return res.status(400).json({ error: 'Student ID already in use' });
    }

    const updated = await Student.findByIdAndUpdate(
      id,
      { studentId, name, birthday, address, school, currentGrade, phoneNo },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update student' });
  }
};

// @desc    Delete a student
// @route   DELETE /api/auth/student/:id
// @access  Private
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Student.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
};