const AbsentDay = require('../models/AbsentDay');
const Course = require('../models/Course');

// POST /api/auth/sessions/absent
exports.createAbsentDay = async (req, res) => {
  try {
    const { courseId, absentDate, reason } = req.body;

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Validate that absentDate matches course's dayOfWeek
    const absentDay = new Date(absentDate);
    const courseDayIndex = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    }[course.dayOfWeek.toLowerCase()];

    const selectedDayIndex = absentDay.getDay();

    if (selectedDayIndex !== courseDayIndex) {
      return res.status(400).json({ 
        error: `Absent date must be a ${course.dayOfWeek} (course's scheduled day)` 
      });
    }

    const absentDayRecord = new AbsentDay({
      course: courseId,
      absentDate: absentDay,
      reason
    });

    await absentDayRecord.save();
    res.status(201).json(absentDayRecord);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'This date is already marked as absent for this course' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to mark absent day' });
  }
};

// GET /api/auth/sessions/absent?courseId=...&month=...&year=...
exports.getAbsentDays = async (req, res) => {
  try {
    const { courseId, month, year } = req.query;
    let filter = {};

    if (courseId) filter.course = courseId;

    if (month != null && year != null) {
      // ✅ FIXED: Include entire last day of the month
      const start = new Date(parseInt(year), parseInt(month), 1);
      const end = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59, 999);
      
      filter.absentDate = { $gte: start, $lte: end };
    }

    const absentDays = await AbsentDay.find(filter)
      .populate('course', 'courseName dayOfWeek startTime endTime')
      .sort({ absentDate: 1 });

    res.json(absentDays);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch absent days' });
  }
};

// DELETE /api/auth/sessions/absent/:id
exports.deleteAbsentDay = async (req, res) => {
  try {
    const deleted = await AbsentDay.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Absent day removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
};