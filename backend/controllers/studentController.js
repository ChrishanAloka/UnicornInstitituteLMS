// controllers/studentController.js
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Payment = require('../models/Payment');
const Course = require('../models/Course');
// @desc    Search student by ID or name + check attendance for a date
// @route   GET /api/auth/student/search?q=...&date=YYYY-MM-DD
// @access  Private

exports.searchStudent = async (req, res) => {
  try {
    const { q, date: dateParam } = req.query;

    // Parse search date
    let searchDate;
    if (dateParam) {
      searchDate = new Date(dateParam);
      if (isNaN(searchDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }
    } else {
      searchDate = new Date();
    }

    // Normalize to local start/end of day
    const startOfDay = new Date(searchDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(searchDate);
    endOfDay.setHours(23, 59, 59, 999);

    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days[searchDate.getDay()].toLowerCase();

    // Helper: Check if enrollment is active on searchDate
    const isActiveEnrollment = (enroll, checkDate) => {
      if (!enroll.startDate) return false;
      const start = new Date(enroll.startDate);
      const end = enroll.endDate ? new Date(enroll.endDate) : null;
      return start <= checkDate && (!end || checkDate <= end);
    };

    // Helper: Check if a course occurs on the searchDate
    const doesCourseOccurOnDate = (course, checkDate) => {
      return course.dayOfWeek?.toLowerCase() === targetDay;
      // if (course.courseType === 'weekly') {
      //   return course.dayOfWeek?.toLowerCase() === targetDay;
      // } else {
      //   // Non-weekly: assume single session on courseStartDate
      //   if (!course.courseStartDate) return false;
      //   const sessionDate = new Date(course.courseStartDate);
      //   sessionDate.setHours(0, 0, 0, 0);
      //   const checkDateNormalized = new Date(checkDate);
      //   checkDateNormalized.setHours(0, 0, 0, 0);
      //   return sessionDate.getTime() === checkDateNormalized.getTime();
      // }
    };

    if (q) {
      // 🔍 Single student mode
      const student = await Student.findOne({
        $or: [
          { studentId: { $regex: new RegExp(`^${q}$`, 'i') } },
          { name: { $regex: q, $options: 'i' } }
        ]
      }).populate('enrolledCourses.course', 
        'courseName dayOfWeek timeFrom timeTo courseType courseStartDate'
      );

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      // Filter enrollments: active + course occurs on searchDate
      const relevantEnrollments = student.enrolledCourses.filter(enroll =>
        enroll.course &&
        isActiveEnrollment(enroll, searchDate) &&
        doesCourseOccurOnDate(enroll.course, searchDate)
      );

      // Fetch attendance for this student on this date
      const attendanceRecords = await Attendance.find({
        studentId: student.studentId,
        date: { $gte: startOfDay, $lt: endOfDay }
      }).select('course status'); // ← include 'status'

      const attendanceStatusMap = new Map();
      attendanceRecords.forEach(record => {
        attendanceStatusMap.set(record.course.toString(), record.status || 'present');
      });

      const enrichedEnrollments = relevantEnrollments.map(enroll => {
        const courseIdStr = enroll.course._id.toString();
        const status = attendanceStatusMap.get(courseIdStr);
        return {
          ...enroll.toObject(),
          isMarked: !!status,
          status: status || null
        };
      });

      const response = student.toObject();
      response.enrolledCourses = enrichedEnrollments;
      return res.json(response);
    }

    // 📋 Bulk mode: get all courses that occur on searchDate (any type)
    const allCoursesOnDate = await Course.find({
      $or: [
        {
          dayOfWeek: { $regex: new RegExp(`^${targetDay}$`, 'i') }
        },
        {
          
          courseStartDate: {
            $gte: startOfDay,
            $lt: endOfDay
          }
        }
      ]
    }).select('_id courseType courseStartDate dayOfWeek');

    if (allCoursesOnDate.length === 0) {
      return res.json([]);
    }

    const courseIds = allCoursesOnDate.map(c => c._id);

    // Find students enrolled in these courses
    const allStudents = await Student.find({
      'enrolledCourses.course': { $in: courseIds }
    })
      .populate('enrolledCourses.course', 
        'courseName dayOfWeek timeFrom timeTo courseType courseStartDate'
      )
      .lean();

    // Pre-fetch all attendance for the day (include status)
    const allAttendance = await Attendance.find({
      date: { $gte: startOfDay, $lt: endOfDay }
    }).select('studentId course status');

    const attendanceStatusMap = new Map();
    allAttendance.forEach(record => {
      const key = `${record.studentId}-${record.course}`;
      attendanceStatusMap.set(key, record.status || 'present');
    });

    const resultStudents = [];

    for (const student of allStudents) {
      const relevantEnrollments = student.enrolledCourses
        .filter(enroll => {
          return (
            enroll.course &&
            isActiveEnrollment(enroll, searchDate) &&
            doesCourseOccurOnDate(enroll.course, searchDate)
          );
        })
        .map(enroll => {
          const key = `${student.studentId}-${enroll.course._id}`;
          const status = attendanceStatusMap.get(key);
          return {
            ...enroll,
            isMarked: !!status,
            status: status || null
          };
        });

      if (relevantEnrollments.length > 0) {
        resultStudents.push({
          ...student,
          enrolledCourses: relevantEnrollments
        });
      }
    }

    res.json(resultStudents);
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

// In your student controller
exports.getRecentStudents = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const students = await Student.find()
    .sort({ updatedAt: -1 }) // most recently updated first
    .select("name studentId updatedAt") // only needed fields
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await Student.countDocuments();

  res.json({
    students,
    totalPages: Math.ceil(total / limit),
    currentPage: page
  });
};