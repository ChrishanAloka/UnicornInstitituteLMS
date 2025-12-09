const Notification = require("../models/Notification");

// GET /api/auth/notifications
exports.getNotifications = async (req, res) => {
  try {
    const userRole = req.user.role;
    const notifications = await Notification.find({ role: userRole, isRead: false }).sort({ timestamp: -1 });
    res.json(notifications);
  } catch (err) {
    console.error("Failed to load notifications:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/auth/notifications/send
exports.sendNotification = async (req, res) => {
  const { userId, message, type, role } = req.body;

  if (!userId || !message || !type || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {

    const userRole = req.user.role;
    const userId = req.user.id;

    const newNotif = new Notification({
      userId: userId,
      message,
      type,
      role: userRole,
      read: false,
      time: new Date()
    });

    await newNotif.save();
    res.json(newNotif);
  } catch (err) {
    console.error("Failed to send notification:", err.message);
    res.status(500).json({ error: "Failed to send notification" });
  }
};

// POST /api/auth/notifications/mark-read
exports.markAsRead = async (req, res) => {
  const { notificationId } = req.body;

  if (!notificationId) {
    return res.status(400).json({ error: "Notification ID is required" });
  }

  try {
    const updated = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error("Failed to mark as read:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/auth/notifications/mark-all-read
exports.markAllAsRead = async (req, res) => {
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ error: "Role is required" });
  }

  try {
    await Notification.updateMany({ role, isRead: false }, { $set: { isRead: true } });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Failed to mark all as read:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};