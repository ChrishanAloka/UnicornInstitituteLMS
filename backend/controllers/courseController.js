const Student = require('../models/Student');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const { getScheduledDates } = require('../utils/dateUtils');

exports.registerCourse = async (req, res) => {
  try {
    const course = new Course(req.body);
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ error: 'Course registration failed' });
  }
};

exports.getCourses = async (req, res) => {
  try {
    const list = await Course.find().populate('instructor', 'name');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Fetch failed' });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const updated = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('instructor', 'name');
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const deleted = await Course.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};

exports.getPaymentTracking = async (req, res) => {
  try {
    const { month, year, courseName = '' } = req.query;

    const now = new Date();
    const filterMonth = month != null ? parseInt(month, 10) : now.getMonth();
    const filterYear = year != null ? parseInt(year, 10) : now.getFullYear();

    if (isNaN(filterMonth) || isNaN(filterYear) || filterMonth < 0 || filterMonth > 11) {
      return res.status(400).json({ error: 'Invalid month or year' });
    }

    const monthStart = new Date(filterYear, filterMonth, 1);
    const monthEnd = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59, 999);

    // Build course filter
    const courseFilter = {
      courseStartDate: { $lte: monthEnd } // ✅ Only courses that started ON or BEFORE selected month
    };

    // Optional: search by course name (case-insensitive)
    if (courseName.trim()) {
      courseFilter.courseName = { $regex: courseName.trim(), $options: 'i' };
    }

    const courses = await Course.find(courseFilter)
      .select('courseName courseType courseFees courseStartDate courseEndDate')
      .lean();

    // Rest of logic remains the same...
    const result = [];

    for (const course of courses) {
      const students = await Student.find({
        'enrolledCourses.course': course._id
      }).select('studentId name enrolledCourses').lean();

      const courseData = {
        courseName: course.courseName,
        courseType: course.courseType,
        courseFees: course.courseFees || 0,
        courseStartDate: course.courseStartDate, // ✅ for frontend display
        courseEndDate: course.courseEndDate,     // ✅
        students: []
      };

      if (students.length === 0) {
        result.push(courseData);
        continue;
      }

      for (const student of students) {
        const enrollment = student.enrolledCourses.find(
          ec => ec.course?.toString() === course._id.toString()
        );

        if (!enrollment?.startDate) continue;

        const startDate = new Date(enrollment.startDate);
        let totalDue = 0;
        let paymentDateFilter = {};

        if (course.courseType === 'monthly') {
          totalDue = course.courseFees || 0;
          paymentDateFilter = { $gte: monthStart, $lte: monthEnd };
        } else {
          totalDue = course.courseFees || 0;
          paymentDateFilter = { $gte: monthStart, $lte: monthEnd };
        }

        const payments = await Payment.find({
          student: student._id,
          course: course._id,
          paymentDate: paymentDateFilter
        }).lean();

        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const progressPercent = totalDue > 0
          ? Math.min(100, Math.round((totalPaid / totalDue) * 100))
          : totalPaid > 0 ? 100 : 0;

        courseData.students.push({
          studentId: student.studentId,
          name: student.name,
          totalPaid,
          totalDue,
          progressPercent,
          enrolledDate: startDate.toISOString().split('T')[0]
        });
      }

      result.push(courseData);
    }

    res.json({
      courses: result,
      activeMonth: filterMonth,
      activeYear: filterYear
    });
  } catch (error) {
    console.error('Track Payment Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Normalize dayOfWeek to capitalized form
const normalizeDay = (day) => {
  if (!day) return null;
  const d = day.trim().toLowerCase();
  const map = {
    'sunday': 'Sunday',
    'monday': 'Monday',
    'tuesday': 'Tuesday',
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sun': 'Sunday',
    'mon': 'Monday',
    'tue': 'Tuesday',
    'wed': 'Wednesday',
    'thu': 'Thursday',
    'fri': 'Friday',
    'sat': 'Saturday',
    '0': 'Sunday',
    '1': 'Monday',
    '2': 'Tuesday',
    '3': 'Wednesday',
    '4': 'Thursday',
    '5': 'Friday',
    '6': 'Saturday'
  };
  return map[d] || null;
};

// Count how many of the scheduled dates the student attended
const countAttended = (attendanceRecords, studentId, scheduledDates) => {
  const attendedDateStrings = new Set(
    attendanceRecords
      .filter(att => att.studentId === studentId)
      .map(att => new Date(att.date).toDateString())
  );

  return scheduledDates.filter(date => {
    return attendedDateStrings.has(date.toDateString());
  }).length;
};

exports.getAttendanceTracking = async (req, res) => {
  try {
    const { month, year } = req.query;

    const now = new Date();
    const filterMonth = month != null ? parseInt(month, 10) : now.getMonth();
    const filterYear = year != null ? parseInt(year, 10) : now.getFullYear();

    if (isNaN(filterMonth) || isNaN(filterYear) || filterMonth < 0 || filterMonth > 11) {
      return res.status(400).json({ error: 'Invalid month or year' });
    }

    // Selected month range
    const monthStart = new Date(filterYear, filterMonth, 1);
    const monthEnd = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59, 999);
    const today = new Date(); // current date

    // "Up to today" end: clamp to selected month
    const uptoTodayEnd = today < monthStart 
      ? monthStart 
      : (today > monthEnd ? monthEnd : today);

    // Fetch relevant courses
    const courses = await Course.find({
      courseStartDate: { $lte: monthEnd }
    })
      .select('courseName courseType courseStartDate courseEndDate dayOfWeek')
      .lean();

    const result = [];

    for (const course of courses) {
      const students = await Student.find({
        'enrolledCourses.course': course._id
      }).select('studentId name enrolledCourses').lean();

      const courseData = {
        courseName: course.courseName,
        courseType: course.courseType,
        courseStartDate: course.courseStartDate,
        courseEndDate: course.courseEndDate,
        dayOfWeek: course.dayOfWeek,
        students: []
      };

      const normalizedDay = normalizeDay(course.dayOfWeek);
      if (!normalizedDay) {
        // Invalid day — treat as 0 sessions
        const zeroStudentData = (enrollment) => ({
          studentId: enrollment.studentId,
          name: enrollment.name,
          enrolledDate: enrollment.startDate ? new Date(enrollment.startDate).toISOString().split('T')[0] : '—',
          monthlyAttended: 0,
          totalMonthly: 0,
          monthlyProgress: 0,
          uptoTodayAttended: 0,
          totalUptoToday: 0,
          uptoTodayProgress: 100 // no sessions = 100% attended
        });

        if (students.length === 0) {
          courseData.totalMonthly = 0;
          courseData.totalUptoToday = 0;
          result.push(courseData);
          continue;
        }

        for (const student of students) {
          const enrollment = student.enrolledCourses.find(
            ec => ec.course?.toString() === course._id.toString()
          );
          if (enrollment?.startDate) {
            courseData.students.push(zeroStudentData(student));
          }
        }
        result.push(courseData);
        continue;
      }

      // ---- FULL MONTH WINDOW ----
      const courseStart = new Date(course.courseStartDate);
      const courseEnd = course.courseEndDate 
        ? new Date(course.courseEndDate) 
        : monthEnd;

      const monthlyWindowStart = courseStart > monthStart ? courseStart : monthStart;
      const monthlyWindowEnd = courseEnd < monthEnd ? courseEnd : monthEnd;

      let monthlyScheduled = [];
      if (monthlyWindowStart <= monthlyWindowEnd) {
        monthlyScheduled = getScheduledDates(monthlyWindowStart, monthlyWindowEnd, normalizedDay);
      }
      const totalMonthly = monthlyScheduled.length;

      // ---- UP TO TODAY WINDOW ----
      const uptoTodayWindowStart = courseStart > monthStart ? courseStart : monthStart;
      const uptoTodayWindowEnd = courseEnd < uptoTodayEnd ? courseEnd : uptoTodayEnd;

      let uptoTodayScheduled = [];
      if (uptoTodayWindowStart <= uptoTodayWindowEnd) {
        uptoTodayScheduled = getScheduledDates(uptoTodayWindowStart, uptoTodayWindowEnd, normalizedDay);
      }
      const totalUptoToday = uptoTodayScheduled.length;

      // Fetch all attendance in the selected month
      const attendanceRecords = await Attendance.find({
        course: course._id,
        date: { $gte: monthStart, $lte: monthEnd }
      }).lean();

      if (students.length === 0) {
        courseData.totalMonthly = totalMonthly;
        courseData.totalUptoToday = totalUptoToday;
        result.push(courseData);
        continue;
      }

      for (const student of students) {
        const enrollment = student.enrolledCourses.find(
          ec => ec.course?.toString() === course._id.toString()
        );

        if (!enrollment?.startDate) continue;

        const monthlyAttended = countAttended(attendanceRecords, student.studentId, monthlyScheduled);
        const uptoTodayAttended = countAttended(attendanceRecords, student.studentId, uptoTodayScheduled);

        const monthlyProgress = totalMonthly > 0
          ? Math.min(100, Math.round((monthlyAttended / totalMonthly) * 100))
          : 0;

        const uptoTodayProgress = totalUptoToday > 0
          ? Math.min(100, Math.round((uptoTodayAttended / totalUptoToday) * 100))
          : 100; // if no sessions held yet, consider 100% attended

        courseData.students.push({
          studentId: student.studentId,
          name: student.name,
          enrolledDate: new Date(enrollment.startDate).toISOString().split('T')[0],
          // Full month
          monthlyAttended,
          totalMonthly,
          monthlyProgress,
          // Up to today
          uptoTodayAttended,
          totalUptoToday,
          uptoTodayProgress
        });
      }

      courseData.totalMonthly = totalMonthly;
      courseData.totalUptoToday = totalUptoToday;
      result.push(courseData);
    }

    res.json({
      courses: result,
      activeMonth: filterMonth,
      activeYear: filterYear
    });
  } catch (error) {
    console.error('Attendance Tracking Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};