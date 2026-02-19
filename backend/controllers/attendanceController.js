// controllers/attendanceController.js
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const Course = require('../models/Course');
const ExtraSession = require('../models/ExtraSession');
const AbsentDay = require('../models/AbsentDay');
const RescheduledSession = require('../models/RescheduledSession');

/**
 * Track attendance for all students across their enrolled courses
 * Supports filtering by month, year, student, and course
 * 
 * Query parameters:
 * - month: 1-12 (optional)
 * - year: YYYY (optional, defaults to current year)
 * - studentId: Custom student ID (optional)
 * - courseId: MongoDB course ID (optional)
 */
exports.trackAttendance = async (req, res) => {
  try {
    const { month, year, studentId, courseId } = req.query;
    
    // Default to current year if not provided
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) : null;

    // Build student filter
    let studentFilter = {};
    if (studentId) {
      studentFilter.studentId = studentId;
    }

    // Fetch all students (or filtered student)
    const students = await Student.find(studentFilter)
      .populate('enrolledCourses.course')
      .lean();

    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found'
      });
    }

    // Build the attendance tracking results
    const attendanceTracking = [];

    for (const student of students) {
      // Filter enrolled courses if courseId is provided
      let enrolledCourses = student.enrolledCourses || [];
      if (courseId) {
        enrolledCourses = enrolledCourses.filter(
          ec => ec.course && ec.course._id.toString() === courseId
        );
      }

      for (const enrollment of enrolledCourses) {
        const course = enrollment.course;
        if (!course) continue;

        // Calculate the tracking period
        const enrollmentStart = new Date(enrollment.startDate);
        const enrollmentEnd = enrollment.endDate ? new Date(enrollment.endDate) : null;

        // Determine the period to track
        let periodStart, periodEnd;
        
        if (targetMonth) {
          // Specific month tracking
          periodStart = new Date(targetYear, targetMonth - 1, 1);
          periodEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59);
        } else {
          // Full year tracking
          periodStart = new Date(targetYear, 0, 1);
          periodEnd = new Date(targetYear, 11, 31, 23, 59, 59);
        }

        // Adjust period based on enrollment dates
        if (enrollmentStart > periodStart) {
          periodStart = enrollmentStart;
        }
        if (enrollmentEnd && enrollmentEnd < periodEnd) {
          periodEnd = enrollmentEnd;
        }

        // Skip if enrollment doesn't overlap with the tracking period
        if (periodStart > periodEnd) {
          continue;
        }

        // Calculate total scheduled sessions for this period
        const totalSessions = await calculateTotalSessions(
          course,
          periodStart,
          periodEnd
        );

        // Get actual attendance records
        const attendanceRecords = await Attendance.find({
          student: student._id,
          course: course._id,
          date: {
            $gte: periodStart,
            $lte: periodEnd
          }
        }).lean();

        // Calculate attendance statistics
        const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
        const absentCount = attendanceRecords.filter(a => a.status === 'absent').length;
        const totalRecorded = attendanceRecords.length;
        
        // Calculate attendance percentage
        const attendancePercentage = totalSessions > 0 
          ? ((presentCount / totalSessions) * 100).toFixed(2)
          : 0;

        // Calculate participation rate (based on recorded sessions)
        const participationRate = totalRecorded > 0
          ? ((presentCount / totalRecorded) * 100).toFixed(2)
          : 0;

        // Group attendance by month for detailed view
        const monthlyBreakdown = targetMonth 
          ? null 
          : await getMonthlyBreakdown(student._id, course._id, targetYear, enrollmentStart, enrollmentEnd);

        attendanceTracking.push({
          studentId: student.studentId,
          studentName: student.name,
          studentMongoId: student._id,
          courseName: course.courseName,
          courseId: course._id,
          dayOfWeek: course.dayOfWeek,
          timeSlot: `${course.timeFrom} - ${course.timeTo}`,
          enrollmentStart: enrollment.startDate,
          enrollmentEnd: enrollment.endDate,
          trackingPeriod: {
            start: periodStart,
            end: periodEnd,
            month: targetMonth,
            year: targetYear
          },
          attendance: {
            totalScheduledSessions: totalSessions,
            totalRecordedSessions: totalRecorded,
            presentCount,
            absentCount,
            unrecordedCount: totalSessions - totalRecorded,
            attendancePercentage: parseFloat(attendancePercentage),
            participationRate: parseFloat(participationRate)
          },
          monthlyBreakdown
        });
      }
    }

    // Sort by student name and course name
    attendanceTracking.sort((a, b) => {
      const nameCompare = a.studentName.localeCompare(b.studentName);
      if (nameCompare !== 0) return nameCompare;
      return a.courseName.localeCompare(b.courseName);
    });

    return res.status(200).json({
      success: true,
      count: attendanceTracking.length,
      filters: {
        month: targetMonth,
        year: targetYear,
        studentId: studentId || 'all',
        courseId: courseId || 'all'
      },
      data: attendanceTracking
    });

  } catch (error) {
    console.error('Error tracking attendance:', error);
    return res.status(500).json({
      success: false,
      message: 'Error tracking attendance',
      error: error.message
    });
  }
};

/**
 * Calculate total scheduled sessions for a course in a given period
 * Accounts for: regular weekly sessions, extra sessions, absent days, rescheduled sessions
 */
async function calculateTotalSessions(course, startDate, endDate) {
  try {
    let totalSessions = 0;

    // 1. Calculate regular weekly sessions
    const dayOfWeekMap = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    
    const courseDayNum = dayOfWeekMap[course.dayOfWeek];
    if (courseDayNum !== undefined) {
      let currentDate = new Date(startDate);
      
      // Move to the first occurrence of the course day
      while (currentDate.getDay() !== courseDayNum) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Count all occurrences of this day of week in the period
      while (currentDate <= endDate) {
        totalSessions++;
        currentDate.setDate(currentDate.getDate() + 7); // Move to next week
      }
    }

    // 2. Get absent days for this course in this period
    const absentDays = await AbsentDay.find({
      course: course._id,
      absentDate: {
        $gte: startDate,
        $lte: endDate
      }
    }).lean();

    // Subtract absent days from total
    totalSessions -= absentDays.length;

    // 3. Get extra sessions for this course in this period
    const extraSessions = await ExtraSession.find({
      course: course._id,
      extraDate: {
        $gte: startDate,
        $lte: endDate
      }
    }).lean();

    // Add extra sessions to total
    totalSessions += extraSessions.length;

    // Note: Rescheduled sessions don't change the total count
    // They just move a session from one date to another

    return Math.max(0, totalSessions); // Ensure non-negative

  } catch (error) {
    console.error('Error calculating total sessions:', error);
    return 0;
  }
}

/**
 * Get monthly breakdown of attendance for a student in a course
 */
async function getMonthlyBreakdown(studentId, courseId, year, enrollmentStart, enrollmentEnd) {
  try {
    const monthlyData = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      
      // Adjust for enrollment dates
      let periodStart = monthStart;
      let periodEnd = monthEnd;
      
      if (enrollmentStart > periodStart) {
        periodStart = enrollmentStart;
      }
      if (enrollmentEnd && enrollmentEnd < periodEnd) {
        periodEnd = enrollmentEnd;
      }
      
      // Skip months outside enrollment period
      if (periodStart > periodEnd) {
        continue;
      }
      
      // Get course for this calculation
      const course = await Course.findById(courseId).lean();
      if (!course) continue;
      
      // Calculate sessions for this month
      const totalSessions = await calculateTotalSessions(course, periodStart, periodEnd);
      
      // Get attendance records for this month
      const records = await Attendance.find({
        student: studentId,
        course: courseId,
        date: {
          $gte: periodStart,
          $lte: periodEnd
        }
      }).lean();
      
      const presentCount = records.filter(r => r.status === 'present').length;
      const absentCount = records.filter(r => r.status === 'absent').length;
      
      const attendancePercentage = totalSessions > 0
        ? ((presentCount / totalSessions) * 100).toFixed(2)
        : 0;
      
      monthlyData.push({
        month,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
        totalSessions,
        presentCount,
        absentCount,
        unrecordedCount: totalSessions - records.length,
        attendancePercentage: parseFloat(attendancePercentage)
      });
    }
    
    return monthlyData;
  } catch (error) {
    console.error('Error getting monthly breakdown:', error);
    return [];
  }
}

// Get student + courses + attendance status for a given date
exports.getStudentWithCourses = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { date } = req.query;

    const student = await Student.findById(studentId)
      .populate("enrolledCourses.course", "courseName dayOfWeek timeFrom timeTo");

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Get attendance records for this date
    const attendanceRecords = await Attendance.find({
      studentId: student.studentId,
      date: normalizeDate(new Date(date))
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

    // Normalize date to start of day
    const attendanceDate = normalizeDate(new Date(date));

    // Upsert attendance record
    const attendance = await Attendance.findOneAndUpdate(
      {
        studentId: studentId,
        course: courseId,
        date: attendanceDate
      },
      {
        studentId: studentId,
        student: student._id,
        course: courseId,
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