const Student = require('../models/Student');
const Course = require('../models/Course');

exports.enrollStudent = async (req, res) => {
  try {
    const { studentId, courseId, startDate, endDate } = req.body;

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Find student by studentId (not _id)
    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if already enrolled
    const alreadyEnrolled = student.enrolledCourses.some(
      e => e.course.toString() === courseId
    );
    if (alreadyEnrolled) {
      return res.status(400).json({ error: 'Student already enrolled in this course' });
    }

    // Add to enrolledCourses
    student.enrolledCourses.push({
      course: courseId,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined
    });

    await student.save();
    res.status(201).json({ message: 'Enrollment successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Enrollment failed' });
  }
};

// Unenroll student from a course
exports.unenrollStudent = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;

    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Remove course from enrolledCourses array
    student.enrolledCourses = student.enrolledCourses.filter(
      (enroll) => enroll.course.toString() !== courseId
    );

    await student.save();
    res.json({ message: 'Student unenrolled successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unenrollment failed' });
  }
};