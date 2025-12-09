import { useState, useEffect } from "react";
import axios from "axios";

const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRole, setUserRole] = useState("cashier");

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://projectnuckels.onrender.com/api/auth/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });

      const role = localStorage.getItem("userRole") || "cashier";
      setUserRole(role);

      const filtered = res.data.filter(n => n.role === role);
      const unread = filtered.filter(n => !n.read).length;

      setNotifications(filtered);
      setUnreadCount(unread);
    } catch (err) {
      console.error("Failed to fetch notifications:", err.message);
    }
  };

  // Send notification and refresh list
  const sendNotification = async (type, message) => {
    try {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");
      const role = localStorage.getItem("userRole") || "cashier";

      await axios.post(
        "https://projectnuckels.onrender.com/api/auth/notifications/send",
        {
          userId, 
          role, 
          message,
          type
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      await fetchNotifications(); // ✅ Auto-refresh after sending
    } catch (err) {
      console.error("Failed to send notification:", err.message);
    }
  };

  // Mark one as read
  const markAsRead = async (notifId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "https://projectnuckels.onrender.com/api/auth/notifications/mark-read",
        { notificationId: notifId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setNotifications(notifications.map(n => n._id === notifId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err.message);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("userRole") || "cashier";

      await axios.post(
        "https://projectnuckels.onrender.com/api/auth/notifications/mark-all-read",
        { role },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err.message);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return {
    notifications,
    unreadCount,
    userRole,
    fetchNotifications,
    sendNotification,
    markAsRead,
    markAllAsRead
  };
};

export default useNotifications;