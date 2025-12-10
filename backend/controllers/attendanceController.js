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

// POST /api/auth/attendance
exports.markAttendance = async (req, res) => {
  const { studentId, courseId, date } = req.body;
  const student = await Student.findOne({ studentId });
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const attendance = new Attendance({
    student: student._id,
    course: courseId,
    date: new Date(date)
  });
  await attendance.save();
  res.status(201).json({ message: 'Attendance marked' });
};