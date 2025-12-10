// controllers/studentController.js
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

// @desc    Search student by ID or name + check attendance for a date
// @route   GET /api/auth/student/search?q=...&date=YYYY-MM-DD
// @access  Private
exports.searchStudent = async (req, res) => {
  try {
    const { q, date } = req.query;

    // Validate query
    if (!q) {
      return res.status(400).json({ error: 'Search query "q" is required' });
    }

    // Validate date (optional, defaults to today)
    let searchDate = date ? new Date(date) : new Date();
    if (isNaN(searchDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Find student by ID or name (case-insensitive)
    const student = await Student.findOne({
      $or: [
        { studentId: { $regex: new RegExp(`^${q}$`, 'i') } }, // Exact match for ID
        { name: { $regex: q, $options: 'i' } }                // Partial match for name
      ]
    }).populate('enrolledCourses.course', 'courseName dayOfWeek timeFrom timeTo');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Fetch attendance records for this student on the given date
    const attendanceRecords = await Attendance.find({
      studentId: student.studentId,
      date: {
        $gte: new Date(searchDate.setHours(0, 0, 0, 0)),
        $lt: new date.sethours(23, 59, 59, 999)
      }
    }).select('course');

    // Create a Set of marked course IDs (as strings)
    const markedCourseIds = new Set(
      attendanceRecords.map(record => record.course.toString())
    );

    // Attach isMarked flag to each enrolled course
    const enrolledWithStatus = student.enrolledCourses.map(enroll => {
      // Ensure we have a valid course object
      if (!enroll.course) {
        return { ...enroll.toObject(), isMarked: false };
      }
      return {
        ...enroll.toObject(),
        isMarked: markedCourseIds.has(enroll.course._id.toString())
      };
    });

    // Prepare response
    const studentResponse = student.toObject();
    studentResponse.enrolledCourses = enrolledWithStatus;

    res.json(studentResponse);
  } catch (error) {
    console.error('Student search error:', error);
    res.status(500).json({ error: 'Server error during student search' });
  }
};

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

// GET /api/auth/student/:studentId/courses
exports.getStudentWithCourses = async (req, res) => {
  const student = await Student.findById(req.params.studentId)
    .populate("enrolledCourses.course", "courseName dayOfWeek timeFrom timeTo");
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json({ student, enrolledCourses: student.enrolledCourses || [] });
};

// Enroll
exports.enrollStudent = async (req, res) => {
  const { courseId, startDate, endDate } = req.body;
  const student = await Student.findById(req.params.studentId);
  student.enrolledCourses.push({ course: courseId, startDate, endDate });
  await student.save();
  await student.populate("enrolledCourses.course", "courseName dayOfWeek timeFrom timeTo");
  res.json({ enrolledCourses: student.enrolledCourses });
};

// Unenroll
exports.unenrollStudent = async (req, res) => {
  const student = await Student.findById(req.params.studentId);
  student.enrolledCourses = student.enrolledCourses.filter(e => e._id.toString() !== req.params.enrollmentId);
  await student.save();
  await student.populate("enrolledCourses.course", "courseName dayOfWeek timeFrom timeTo");
  res.json({ enrolledCourses: student.enrolledCourses });
};