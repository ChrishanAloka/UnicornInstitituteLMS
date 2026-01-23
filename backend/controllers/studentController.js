// controllers/studentController.js
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const RescheduledSession = require('../models/RescheduledSession');

// @desc    Search student by ID or name + check attendance for a date
// @route   GET /api/auth/student/search?q=...&date=YYYY-MM-DD
// @access  Private

// Helper to format date as YYYY-MM-DD
const formatDateDisplay = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Helper: Check if enrollment is active on a given date
const isActiveEnrollment = (enroll, checkDate) => {
  if (!enroll) return false;
  
  // If no startDate, assume active from beginning of time
  const start = enroll.startDate ? new Date(enroll.startDate) : new Date(0);
  const end = enroll.endDate ? new Date(enroll.endDate) : null;
  
  const check = new Date(checkDate);
  return start <= check && (!end || check <= end);
};

// Main search handler
exports.searchStudent = async (req, res) => {
  try {
    const { q, date: dateParam } = req.query;

    // Parse and validate date
    let searchDate;
    if (dateParam) {
      searchDate = new Date(dateParam);
      if (isNaN(searchDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }
    } else {
      searchDate = new Date();
    }

    // Normalize to start/end of day (local time)
    const startOfDay = new Date(searchDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(searchDate);
    endOfDay.setHours(23, 59, 59, 999);

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days[searchDate.getDay()].toLowerCase();

    // ─── STEP 1: Is this an ORIGINAL date that was MOVED AWAY? ───
    const movedAwaySession = await RescheduledSession.findOne({
      originalDate: { $gte: startOfDay, $lt: endOfDay }
    }).populate('course', 'courseName');

    if (movedAwaySession) {
      return res.json({
        type: 'MOVED_AWAY',
        message: `The session for "${movedAwaySession.course.courseName}" on ${formatDateDisplay(searchDate)} has been rescheduled.`,
        newDate: movedAwaySession.newDate,
        courseName: movedAwaySession.course.courseName
      });
    }

    // ─── STEP 2: Gather ALL course IDs active on this date ───
    const courseIdsSet = new Set();

    // A. Regular weekly courses on this weekday
    const regularCourses = await Course.find({
      $expr: {
        $eq: [
          { $toLower: { $trim: { input: "$dayOfWeek" } } },
          targetDay // already lowercase, e.g., "tuesday"
        ]
      }
    }).select('_id');
    regularCourses.forEach(c => courseIdsSet.add(c._id.toString()));

    // B. Single-session courses (non-weekly) on this exact date
    const singleSessionCourses = await Course.find({
      courseStartDate: { $gte: startOfDay, $lt: endOfDay }
    }).select('_id');
    singleSessionCourses.forEach(c => courseIdsSet.add(c._id.toString()));

    // C. Courses RESCHEDULED TO this date
    const rescheduledSessions = await RescheduledSession.find({
      newDate: { $gte: startOfDay, $lt: endOfDay }
    }).select('course');
    rescheduledSessions.forEach(s => courseIdsSet.add(s.course.toString()));

    const courseIds = Array.from(courseIdsSet);

    // If no courses scheduled at all
    if (courseIds.length === 0) {
      if (q) {
        return res.status(404).json({ error: 'Student not found' });
      }
      return res.json({ type: 'NORMAL', students: [] });
    }

    // ─── STEP 3: Fetch students enrolled in ANY of these courses ───
    const allStudents = await Student.find({
      'enrolledCourses.course': { $in: courseIds.map(id => id) }
    }).populate('enrolledCourses.course', 'courseName dayOfWeek timeFrom timeTo courseType courseStartDate');

    // ─── STEP 4: Fetch attendance records for this date ───
    const allAttendance = await Attendance.find({
      date: { $gte: startOfDay, $lt: endOfDay }
    }).select('studentId course status');

    const attendanceMap = new Map();
    allAttendance.forEach(record => {
      const key = `${record.studentId}-${record.course}`;
      attendanceMap.set(key, record.status || 'present');
    });

    // ─── STEP 5: Filter & enrich relevant enrollments ───
    const resultStudents = [];

    for (const student of allStudents) {
      if (!Array.isArray(student.enrolledCourses)) continue;

      const relevantEnrollments = student.enrolledCourses
      .filter(enroll => {
        if (!enroll?.course?._id) return false;
        const isTargetCourse = courseIds.includes(enroll.course._id.toString());
        if (!isTargetCourse) return false;

        // ✅ Enforce enrollment was active ON THE SELECTED DATE
        return isActiveEnrollment(enroll, searchDate);
      })
      .map(enroll => {
        const key = `${student.studentId}-${enroll.course._id}`;
        const status = attendanceMap.get(key);
        return {
          ...enroll.toObject(),
          isMarked: !!status,
          status: status || null
        };
      });

      if (relevantEnrollments.length > 0) {
        resultStudents.push({
          ...student.toObject(),
          enrolledCourses: relevantEnrollments
        });
      }
    }

    // ─── STEP 6: Handle single-student search (q) ───
    if (q) {
      const matchedStudent = resultStudents.find(s =>
        s.studentId?.toString().toLowerCase() === q.toLowerCase() ||
        s.name?.toLowerCase().includes(q.toLowerCase())
      );

      if (!matchedStudent) {
        return res.status(404).json({ error: 'No active course for this student on selected date' });
      }

      return res.json(matchedStudent); // backward-compatible response
    }

    // ─── STEP 7: Determine response type for frontend banner ───
    let responseType = 'NORMAL';
    let originalSessions = [];

    if (rescheduledSessions.length > 0) {
      responseType = 'RESCHEDULED_SESSION';
      // Populate course names for banner
      originalSessions = rescheduledSessions.map(s => {
        // Find course name from student data or fetch separately if needed
        let courseName = 'Unknown Course';
        for (const student of allStudents) {
          const match = student.enrolledCourses.find(ec => 
            ec.course?._id?.toString() === s.course.toString()
          );
          if (match) {
            courseName = match.course.courseName;
            break;
          }
        }
        return {
          courseName,
          originalDate: s.originalDate
        };
      });
    }

    console.log('🔍 Searching for courses on:', {
      date: searchDate.toISOString().split('T')[0],
      targetDay,
      courseIdsCount: courseIds.length,
      regularCourseCount: regularCourses.length,
      rescheduledCount: rescheduledSessions.length
    });

    console.log('📊 Total students with matching enrollments:', allStudents.length);
    console.log('✅ Students after enrollment + course filtering:', resultStudents.length);

    // Optional: log why some were excluded
    allStudents.forEach(student => {
      const matches = student.enrolledCourses.filter(ec => 
        courseIds.includes(ec.course?._id?.toString())
      );
      if (matches.length === 0) {
        console.log('❌ Student not in any target course:', student.studentId);
      } else {
        matches.forEach(ec => {
          const active = isActiveEnrollment(ec, searchDate);
          if (!active) {
            console.log('🚫 Enrollment inactive:', student.studentId, ec.startDate, ec.endDate, searchDate);
          }
        });
      }
    });

    // Final bulk response
    return res.json({
      type: responseType,
      students: resultStudents,
      originalSessions
    });

  } catch (error) {
    console.error('Student search error:', error);
    res.status(500).json({ error: 'Server error during student search' });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id)
      .populate('enrolledCourses.course', 'courseName dayOfWeek timeFrom timeTo')
      .lean(); // lean() returns plain object, slightly faster

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student by ID:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
};


// @desc    Register a new student
// @route   POST /api/auth/student/register
// @access  Private (admin or authorized user)
exports.registerStudent = async (req, res) => {
  try {
    const { 
      studentId, name, birthday, address, school, currentGrade, phoneNo,
      email, guardianName, guardianPhoneNo, nicNumber 
    } = req.body;

    // Validate mandatory new fields
    if (!guardianName || !guardianPhoneNo) {
      return res.status(400).json({ error: 'Guardian name and phone number are required' });
    }

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
      phoneNo,
      email,
      guardianName,
      guardianPhoneNo,
      nicNumber
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

exports.getAllRegisterdStudents = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Student.countDocuments();
    const students = await Student.find()
      .select('name studentId birthday phoneNo email school currentGrade createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      students,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// @desc    Update a student
// @route   PUT /api/auth/student/:id
// @access  Private
exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      studentId, name, birthday, address, school, currentGrade, phoneNo,
      email, guardianName, guardianPhoneNo, nicNumber 
    } = req.body;

    // Validate mandatory new fields on update
    if (!guardianName || !guardianPhoneNo) {
      return res.status(400).json({ error: 'Guardian name and phone number are required' });
    }

    const existing = await Student.findOne({ studentId, _id: { $ne: id } });
    if (existing) {
      return res.status(400).json({ error: 'Student ID already in use' });
    }

    const updated = await Student.findByIdAndUpdate(
      id,
      { 
        studentId, name, birthday, address, school, currentGrade, phoneNo,
        email, guardianName, guardianPhoneNo, nicNumber 
      },
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

// GET /api/auth/students/:studentId/payments
exports.getStudentPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ student: req.params.studentId })
      .populate('course', 'courseName')
      .populate('student', 'name studentId')
      .sort({ paymentDate: -1 });

    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

// POST /api/auth/payments
exports.createPayment = async (req, res) => {
  try {
    const { studentId, courseId, amount, method, notes, paymentDate } = req.body;

    const payment = new Payment({
      student: studentId,
      course: courseId,
      amount,
      method,
      notes,
      paymentDate: paymentDate ? new Date(paymentDate) : Date.now()
    });

    await payment.save();
    await payment.populate('course', 'courseName');
    res.status(201).json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};

// PUT /api/auth/students/:studentId/enrollments/:enrollmentId
exports.updateEnrollmentDates = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    const student = await Student.findById(req.params.studentId);
    
    const enrollment = student.enrolledCourses.id(req.params.enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Update dates (endDate can be null/empty)
    enrollment.startDate = startDate || undefined;
    enrollment.endDate = endDate || undefined;

    await student.save();
    await student.populate("enrolledCourses.course", "courseName dayOfWeek timeFrom timeTo");
    
    res.json({ enrolledCourses: student.enrolledCourses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update enrollment dates' });
  }
};

// controllers/studentController.js
exports.getRecentStudents = async (req, res) => {
  try {
    // Parse and fallback to defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    console.log("page", page, "limit", limit);
    // Ensure positive integers
    if (page < 1) page = 1;
    if (limit < 1) limit = 12;
    if (limit > 100) limit = 100; // prevent abuse

    const skip = (page - 1) * limit;

    const total = await Student.countDocuments();
    const students = await Student.find()
      .sort({ updatedAt: -1 })
      .select("name studentId updatedAt") // only needed fields
      .skip(skip)
      .limit(limit);

    res.json({
      students,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (err) {
    console.error("Error in getRecentStudents:", err); // 👈 Critical for debugging
    res.status(500).json({ error: "Failed to fetch recent students" });
  }
};