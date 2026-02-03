const ExtraSession = require('../models/ExtraSession');
const Course = require('../models/Course');

// POST /api/auth/sessions/extra
exports.createExtraSession = async (req, res) => {
  try {
    const { courseId, extraDate, startTime, endTime, reason } = req.body;

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // Validate time fields
    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'Start and end times are required' });
    }

    // Time order validation
    if (startTime >= endTime) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }

    const extraSession = new ExtraSession({
      course: courseId,
      extraDate: new Date(extraDate),
      startTime,
      endTime,
      reason
    });

    await extraSession.save();
    res.status(201).json(extraSession);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'An extra session already exists for this date and course' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to add extra session' });
  }
};

// GET /api/auth/sessions/extra?courseId=...&month=...&year=...
exports.getExtraSessions = async (req, res) => {
  try {
    const { courseId, month, year } = req.query;
    let filter = {};

    if (courseId) filter.course = courseId;

    if (month != null && year != null) {
      // ✅ FIXED: Include entire last day of the month
      const start = new Date(parseInt(year), parseInt(month), 1);
      const end = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59, 999);
      
      filter.extraDate = { $gte: start, $lte: end };
    }

    const extraSessions = await ExtraSession.find(filter)
      .populate('course', 'courseName dayOfWeek startTime endTime')
      .sort({ extraDate: 1 });

    res.json(extraSessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch extra sessions' });
  }
};

// DELETE /api/auth/sessions/extra/:id
exports.deleteExtraSession = async (req, res) => {
  try {
    const deleted = await ExtraSession.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Extra session removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
};