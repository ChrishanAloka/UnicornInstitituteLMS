const Student = require('../models/Student');
const Course = require('../models/Course');
const Payment = require('../models/Payment');

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

// Helper: Full months between two dates (inclusive)
function getFullMonthsBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  let months = (e.getFullYear() - s.getFullYear()) * 12;
  months -= s.getMonth();
  months += e.getMonth();
  if (e.getDate() < s.getDate()) months--;
  return Math.max(0, months + 1);
}

exports.getPaymentTracking = async (req, res) => {
  try {
    const currentDate = new Date();

    // Fetch only 'monthly' and 'other' courses with fees
    const courses = await Course.find({
      courseType: { $in: ['monthly', 'other'] },
      courseFees: { $ne: null }
    }).select('courseName courseType courseFees').lean();

    const result = [];

    for (const course of courses) {
      const students = await Student.find({
        'enrolledCourses.course': course._id
      }).select('studentId name enrolledCourses').lean();

      if (students.length === 0) continue;

      const courseData = {
        courseName: course.courseName,
        courseType: course.courseType,
        courseFees: course.courseFees,
        students: []
      };

      for (const student of students) {
        const enrollment = student.enrolledCourses.find(
          ec => ec.course?.toString() === course._id.toString()
        );

        if (!enrollment?.startDate) continue;

        const startDate = new Date(enrollment.startDate);
        let endDate = enrollment.endDate ? new Date(enrollment.endDate) : null;
        let totalDue = 0;
        let paymentDateFilter = {};

        if (course.courseType === 'monthly') {
          // Monthly: total due = elapsed months × fee
          const months = getFullMonthsBetween(startDate, currentDate);
          totalDue = months * course.courseFees;
          // Payments from enrollment start → today
          paymentDateFilter = { $gte: startDate, $lte: currentDate };
        } 
        else if (course.courseType === 'other') {
          // Other: total due = courseFees (one-time)
          totalDue = course.courseFees;
          // Payments from startDate → endDate (or today if no end)
          const payEnd = endDate && endDate < currentDate ? endDate : currentDate;
          paymentDateFilter = { $gte: startDate, $lte: payEnd };
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
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate ? endDate.toISOString().split('T')[0] : null
        });
      }

      if (courseData.students.length > 0) {
        result.push(courseData);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Track Payment Error:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
};