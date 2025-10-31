// backend/controllers/notificationController.js
import User from "../models/User.js";

/**
 * ✅ Get all notifications for the logged-in user
 */
export const getAllNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("notifications");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.notifications.sort((a, b) => b.date - a.date));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ✅ Mark a notification as read
 */
export const markNotificationRead = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const note = user.notifications.id(req.params.id);
    if (!note) return res.status(404).json({ message: "Notification not found" });

    note.read = true;
    await user.save();
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ✅ Clear ALL notifications for a user
 */
export const clearAllNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.notifications = [];
    await user.save();
    res.json({ message: "All notifications cleared successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * ✅ Send a new notification (admin or superadmin)
 */
export const sendNotification = async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!message) return res.status(400).json({ message: "Message required" });

    if (userId) {
      // send to specific user
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      user.notifications.push({ message });
      await user.save();
    } else {
      // broadcast
      await User.updateMany({}, { $push: { notifications: { message } } });
    }

    res.json({ message: "Notification(s) sent successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
