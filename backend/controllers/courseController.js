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

// Helper: get start/end of current week (Monday to Sunday)
function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d.setDate(d.getDate() + diffToMonday));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Helper: get start/end of current month
function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

exports.getPaymentTracking = async (req, res) => {
  try {
    const currentDate = new Date();
    const weekRange = getWeekRange(currentDate);
    const monthRange = getMonthRange(currentDate);

    // Fetch all courses (only necessary fields)
    const courses = await Course.find({
      courseFees: { $exists: true }
    }).select('courseName courseType courseFees courseStartDate courseEndDate').lean();

    const result = [];

    for (const course of courses) {
      let paymentDateFilter;

      if (course.courseType === 'monthly') {
        paymentDateFilter = { $gte: monthRange.start, $lte: monthRange.end };
      } else if (course.courseType === 'weekly') {
        paymentDateFilter = { $gte: weekRange.start, $lte: weekRange.end };
      } else if (course.courseType === 'other') {
        if (!course.courseStartDate) continue;
        const endDate = course.courseEndDate || new Date('9999-12-31');
        paymentDateFilter = { $gte: course.courseStartDate, $lte: endDate };
      } else {
        continue; // skip unsupported types
      }

      // Find students enrolled in this course
      const students = await Student.find({
        'enrolledCourses.course': course._id
      }).select('studentId name').lean();

      if (students.length === 0) continue;

      const courseData = {
        courseName: course.courseName,
        courseType: course.courseType,
        courseFees: course.courseFees,
        students: []
      };

      for (const student of students) {
        const payments = await Payment.find({
          student: student._id,
          course: course._id,
          paymentDate: paymentDateFilter
        }).lean();

        const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        const progressPercent = course.courseFees
          ? Math.min(100, Math.round((totalPaid / course.courseFees) * 100))
          : totalPaid > 0 ? 100 : 0;

        courseData.students.push({
          studentId: student.studentId,
          name: student.name,
          totalPaid,
          progressPercent
        });
      }

      result.push(courseData);
    }

    res.json(result);
  } catch (error) {
    console.error('Payment Tracking Error:', error);
    res.status(500).json({ error: 'Failed to retrieve payment tracking data' });
  }
};