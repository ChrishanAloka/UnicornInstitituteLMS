const RescheduledSession = require('../models/RescheduledSession');
const Course = require('../models/Course');

// POST /api/auth/sessions/reschedule
exports.createRescheduledSession = async (req, res) => {
  try {
    const { courseId, originalDate, newDate, newStartTime, newEndTime, reason } = req.body;

    // Validate course exists
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });

    // ✅ Validate time fields
    if (!newStartTime || !newEndTime) {
      return res.status(400).json({ error: 'Start and end times are required' });
    }

    // Time order validation
    if (newStartTime >= newEndTime) {
      return res.status(400).json({ error: 'Start time must be before end time' });
    }

    const session = new RescheduledSession({
      course: courseId,
      originalDate: new Date(originalDate),
      newDate: new Date(newDate),
      newStartTime, // ✅ NEW
      newEndTime,   // ✅ NEW
      reason
    });

    await session.save();
    res.status(201).json(session);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'This session is already rescheduled' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to reschedule session' });
  }
};

// GET /api/auth/sessions/reschedule?courseId=...&month=...&year=...
exports.getRescheduledSessions = async (req, res) => {
  try {
    const { courseId, month, year } = req.query;
    let filter = {};

    if (courseId) filter.course = courseId;

    if (month != null && year != null) {
      // ✅ FIXED: Include entire last day of the month
      const start = new Date(parseInt(year), parseInt(month), 1);
      const end = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59, 999);
      
      filter.$or = [
        { originalDate: { $gte: start, $lte: end } },
        { newDate: { $gte: start, $lte: end } }
      ];
    }

    const sessions = await RescheduledSession.find(filter)
      .populate('course', 'courseName dayOfWeek timeFrom timeTo') // ✅ Include course times
      .sort({ originalDate: 1 });

    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rescheduled sessions' });
  }
};

// DELETE /api/auth/sessions/reschedule/:id
exports.deleteRescheduledSession = async (req, res) => {
  try {
    const deleted = await RescheduledSession.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Rescheduled session removed' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};