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
    const { studentId, courseId, date, status = 'present' } = req.body;

    if (!studentId || !courseId || !date) {
      return res.status(400).json({ error: 'Missing required fields: studentId, courseId, date' });
    }

    // Find student to get their MongoDB _id
    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Normalize date to start of day (to avoid time mismatches)
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Upsert using ONLY schema-defined fields
    const attendance = await Attendance.findOneAndUpdate(
      {
        studentId: studentId,
        course: courseId,        // ← match by 'course' (ObjectId)
        date: attendanceDate
      },
      {
        studentId: studentId,    // string ID (for easy lookup)
        student: student._id,    // ObjectId reference
        course: courseId,        // ObjectId reference
        date: attendanceDate,
        status: status.toLowerCase()
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(attendance);
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};