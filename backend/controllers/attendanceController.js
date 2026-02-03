const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Course = require('../models/Course');
const ExtraSession = require('../models/ExtraSession');
const AbsentDay = require('../models/AbsentDay');
const RescheduledSession = require('../models/RescheduledSession');

// Helper: Get all session dates for a course in a given month
const getSessionDatesForCourse = async (courseId, month, year) => {
  const course = await Course.findById(courseId);
  if (!course) return { regular: [], extra: [], absent: [], rescheduled: [] };

  // 1. Calculate regular weekly sessions
  const regularSessions = [];
  const targetDayIndex = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6
  }[course.dayOfWeek.toLowerCase()];

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  let currentDate = new Date(firstDayOfMonth);
  while (currentDate <= lastDayOfMonth) {
    if (currentDate.getDay() === targetDayIndex) {
      regularSessions.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 2. Get extra sessions
  const extraSessions = await ExtraSession.find({
    course: courseId,
    extraDate: {
      $gte: firstDayOfMonth,
      $lte: lastDayOfMonth
    }
  }).select('extraDate');

  // 3. Get absent days
  const absentDays = await AbsentDay.find({
    course: courseId,
    absentDate: {
      $gte: firstDayOfMonth,
      $lte: lastDayOfMonth
    }
  }).select('absentDate');

  // 4. Get rescheduled sessions (both original and new dates in month)
  const rescheduledSessions = await RescheduledSession.find({
    course: courseId,
    $or: [
      { originalDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth } },
      { newDate: { $gte: firstDayOfMonth, $lte: lastDayOfMonth } }
    ]
  }).select('originalDate newDate');

  return {
    regular: regularSessions.map(d => d.toISOString().split('T')[0]),
    extra: extraSessions.map(s => new Date(s.extraDate).toISOString().split('T')[0]),
    absent: absentDays.map(a => new Date(a.absentDate).toISOString().split('T')[0]),
    rescheduled: rescheduledSessions.map(r => ({
      original: new Date(r.originalDate).toISOString().split('T')[0],
      new: new Date(r.newDate).toISOString().split('T')[0]
    }))
  };
};

// GET /api/auth/attendance/track?studentId=&courseId=&month=&year=
exports.trackAttendance = async (req, res) => {
  try {
    const { studentId, courseId, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required' });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Get all enrolled students if no specific student
    let students = [];
    if (studentId) {
      const student = await Student.findOne({ studentId }).populate('enrolledCourses.course');
      if (!student) return res.status(404).json({ error: 'Student not found' });
      students = [student];
    } else {
      students = await Student.find().populate('enrolledCourses.course');
    }

    // Filter by course if specified
    let filteredStudents = students;
    if (courseId) {
      filteredStudents = students.filter(s => 
        s.enrolledCourses.some(ec => ec.course._id.toString() === courseId)
      );
    }

    const results = [];

    for (const student of filteredStudents) {
      // Filter enrolled courses by courseId if specified
      const enrolledCourses = courseId 
        ? student.enrolledCourses.filter(ec => ec.course._id.toString() === courseId)
        : student.enrolledCourses;

      for (const enrollment of enrolledCourses) {
        const course = enrollment.course;
        if (!course) continue;

        // Get all session dates for this course
        const sessionDates = await getSessionDatesForCourse(course._id, monthNum, yearNum);

        // Calculate total sessions
        let totalSessions = sessionDates.regular.length;
        
        // Add extra sessions
        totalSessions += sessionDates.extra.length;
        
        // Subtract absent sessions
        totalSessions -= sessionDates.absent.length;
        
        // Add rescheduled sessions (only count new dates, not originals)
        const rescheduledNewDatesInMonth = sessionDates.rescheduled.filter(r => {
          const newDateMonth = new Date(r.new).getMonth();
          return newDateMonth === monthNum;
        });
        totalSessions += rescheduledNewDatesInMonth.length;

        // Get attendance records for this student and course
        const firstDay = new Date(yearNum, monthNum, 1);
        const lastDay = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999);

        const attendanceRecords = await Attendance.find({
          studentId: student.studentId,
          course: course._id,
          date: { $gte: firstDay, $lte: lastDay }
        });

        // Count attended and absent
        const attended = attendanceRecords.filter(r => r.status === 'present').length;
        const absent = attendanceRecords.filter(r => r.status === 'absent').length;

        // Calculate percentage
        const attendancePercentage = totalSessions > 0 
          ? Math.round((attended / totalSessions) * 100) 
          : 0;

        results.push({
          student: {
            _id: student._id,
            studentId: student.studentId,
            name: student.name,
            currentGrade: student.currentGrade
          },
          course: {
            _id: course._id,
            courseName: course.courseName,
            dayOfWeek: course.dayOfWeek,
            timeFrom: course.timeFrom,
            timeTo: course.timeTo
          },
          month: monthNum,
          year: yearNum,
          totalSessions,
          attendedSessions: attended,
          absentSessions: absent,
          attendancePercentage,
          details: {
            regularSessions: sessionDates.regular.length,
            extraSessions: sessionDates.extra.length,
            absentSessions: sessionDates.absent.length,
            rescheduledSessions: rescheduledNewDatesInMonth.length,
            sessionDates: {
              regular: sessionDates.regular,
              extra: sessionDates.extra,
              absent: sessionDates.absent,
              rescheduled: sessionDates.rescheduled
            }
          }
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Track attendance error:', error);
    res.status(500).json({ error: 'Failed to track attendance' });
  }
};

// GET /api/auth/attendance/student/:studentId?month=&year=
exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { month, year } = req.query;

    const student = await Student.findOne({ studentId }).populate('enrolledCourses.course');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const results = await exports.trackAttendance({
      query: { studentId, month, year }
    }, { json: (data) => data });

    res.json({
      student: {
        _id: student._id,
        studentId: student.studentId,
        name: student.name,
        currentGrade: student.currentGrade
      },
      attendance: results
    });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({ error: 'Failed to get student attendance' });
  }
};

// GET /api/auth/attendance/course/:courseId?month=&year=
exports.getCourseAttendance = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { month, year } = req.query;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const results = await exports.trackAttendance({
      query: { courseId, month, year }
    }, { json: (data) => data });

    // Group by student
    const grouped = {};
    results.forEach(record => {
      if (!grouped[record.student.studentId]) {
        grouped[record.student.studentId] = {
          student: record.student,
          attendance: []
        };
      }
      grouped[record.student.studentId].attendance.push(record);
    });

    res.json({
      course: {
        _id: course._id,
        courseName: course.courseName,
        dayOfWeek: course.dayOfWeek
      },
      students: Object.values(grouped)
    });
  } catch (error) {
    console.error('Get course attendance error:', error);
    res.status(500).json({ error: 'Failed to get course attendance' });
  }
};

// GET /api/auth/attendance/details?studentId=&courseId=&month=&year=
exports.getAttendanceDetails = async (req, res) => {
  try {
    const { studentId, courseId, month, year } = req.query;

    if (!studentId || !courseId || !month || !year) {
      return res.status(400).json({ error: 'All parameters are required' });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Get session dates
    const sessionDates = await getSessionDatesForCourse(courseId, monthNum, yearNum);

    // Get attendance records
    const firstDay = new Date(yearNum, monthNum, 1);
    const lastDay = new Date(yearNum, monthNum + 1, 0, 23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      studentId,
      course: courseId,
      date: { $gte: firstDay, $lte: lastDay }
    }).sort({ date: 1 });

    // Build detailed view
    const allSessionDates = [
      ...sessionDates.regular,
      ...sessionDates.extra,
      ...sessionDates.rescheduled.map(r => r.new)
    ].filter(date => {
      // Remove absent dates
      return !sessionDates.absent.includes(date);
    });

    const detailedAttendance = allSessionDates.map(date => {
      const record = attendanceRecords.find(r => 
        new Date(r.date).toISOString().split('T')[0] === date
      );
      
      const isExtra = sessionDates.extra.includes(date);
      const isRescheduled = sessionDates.rescheduled.some(r => r.new === date);
      const isRegular = sessionDates.regular.includes(date);

      return {
        date,
        type: isExtra ? 'extra' : isRescheduled ? 'rescheduled' : 'regular',
        status: record ? record.status : 'unmarked',
        markedAt: record ? record.createdAt : null
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      sessionDates,
      attendanceRecords,
      detailedAttendance,
      summary: {
        totalSessions: allSessionDates.length,
        attended: detailedAttendance.filter(d => d.status === 'present').length,
        absent: detailedAttendance.filter(d => d.status === 'absent').length,
        unmarked: detailedAttendance.filter(d => d.status === 'unmarked').length
      }
    });
  } catch (error) {
    console.error('Get attendance details error:', error);
    res.status(500).json({ error: 'Failed to get attendance details' });
  }
};

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