const Student = require('../models/Student');
// controllers/studentController.js
const Attendance = require('../models/Attendance');

// Get student + courses + attendance status for a given date
exports.getStudentWithCourses = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { date } = req.query; // ← Accept date query param

    const student = await Student.findById(studentId)
      .populate("enrolledCourses.course", "courseName dayOfWeek timeFrom timeTo");

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Get attendance records for this date
    const attendanceRecords = await Attendance.find({
      studentId: student.studentId,
      date: new Date(date)
    }).select('course');

    // Create a Set of course IDs already marked
    const markedCourseIds = new Set(
      attendanceRecords.map(record => record.course.toString())
    );

    // Attach marked status to each enrolled course
    const enrolledWithStatus = student.enrolledCourses.map(enroll => ({
      ...enroll.toObject(),
      isMarked: markedCourseIds.has(enroll.course._id.toString())
    }));

    res.json({
      student,
      enrolledCourses: enrolledWithStatus
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};
// POST /api/auth/attendance/mark

exports.markAttendance = async (req, res) => {
  try {
    const { studentId, courseId, date, status } = req.body;

    // 🔍 Step 1: Find student by custom studentId to get MongoDB _id
    const studentDoc = await Student.findOne({ studentId });
    if (!studentDoc) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // 🔍 Step 2: Check if already marked for this date/course
    const existing = await Attendance.findOne({ 
      student: studentDoc._id, 
      courseId, 
      date 
    });
    if (existing) {
      return res.status(400).json({ error: 'Attendance already marked' });
    }

    // ✅ Step 3: Create attendance with BOTH IDs
    const record = new Attendance({
      studentId: studentId,        // e.g., "ID2026"
      student: studentDoc._id,     // MongoDB ObjectId
      course: courseId,
      date: new Date(date),
      status
    });

    await record.save();
    res.json({ success: true, message: 'Attendance marked' });
  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};