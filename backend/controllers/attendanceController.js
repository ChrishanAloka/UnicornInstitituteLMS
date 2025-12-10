const Student = require('../models/Student');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');

// Get student + courses for a given date
exports.getStudentAttendanceData = async (req, res) => {
  try {
    const { studentId, date } = req.query;
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    const student = await Student.findOne({ studentId })
      .populate('enrolledCourses.course', 'courseName dayOfWeek timeFrom timeTo')
      .lean();

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Filter active enrollments (within start/end date)
    const activeEnrollments = student.enrolledCourses.filter(e => {
      const now = targetDate;
      const start = new Date(e.startDate);
      const end = e.endDate ? new Date(e.endDate) : new Date('2100-01-01');
      return now >= start && now <= end;
    });

    // Courses scheduled on this day of week
    const todayCourses = activeEnrollments
      .filter(e => e.course.dayOfWeek === dayOfWeek)
      .map(e => e.course);

    // Find next scheduled course (within next 7 days)
    let nextCourse = null;
    let nextDate = null;
    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(targetDate);
      futureDate.setDate(futureDate.getDate() + i);
      const futureDay = futureDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const course = activeEnrollments.find(e => e.course.dayOfWeek === futureDay)?.course;
      if (course) {
        nextCourse = course;
        nextDate = futureDate;
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Record attendance
exports.markAttendance = async (req, res) => {
  try {
    const { studentId, courseId, date, status = 'present' } = req.body;

    const student = await Student.findOne({ studentId });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const attendance = new Attendance({
      student: student._id,
      course: courseId,
      date: new Date(date),
      status
    });

    await attendance.save();
    res.status(201).json({ message: 'Attendance marked', attendance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};