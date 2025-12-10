const Student = require('../models/Student');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');

// GET /api/auth/attendance?studentId=STU123&date=2025-12-10
exports.getStudentAttendanceData = async (req, res) => {
  const { studentId, date } = req.query;
  if (!studentId || !date) {
    return res.status(400).json({ error: 'studentId and date are required' });
  }

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  const student = await Student.findOne({ studentId })
    .populate('enrolledCourses.course', 'courseName dayOfWeek timeFrom timeTo')
    .lean();

  if (!student) return res.status(404).json({ error: 'Student not found' });

  // Filter active enrollments
  const active = student.enrolledCourses.filter(e => {
    const start = new Date(e.startDate);
    const end = e.endDate ? new Date(e.endDate) : new Date('2100-01-01');
    return targetDate >= start && targetDate <= end;
  });

  const todayCourses = active
    .filter(e => e.course.dayOfWeek === dayOfWeek)
    .map(e => e.course);

  // Find next course within 7 days
  let nextCourse = null;
  let nextDate = null;
  for (let i = 1; i <= 7; i++) {
    const future = new Date(targetDate);
    future.setDate(future.getDate() + i);
    const futureDay = future.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const match = active.find(e => e.course.dayOfWeek === futureDay);
    if (match) {
      nextCourse = match.course;
      nextDate = future;
      break;
    }
  }

  res.json({
    student: {
      _id: student._id,
      studentId: student.studentId,
      name: student.name,
      currentGrade: student.currentGrade
    },
    todayCourses,
    nextCourse: nextCourse ? { ...nextCourse, nextDate } : null,
    date: targetDate
  });
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