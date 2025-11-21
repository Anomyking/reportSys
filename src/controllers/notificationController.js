// backend/controllers/notificationController.js
import User from "../models/User.js";

// Get all notifications for the logged-in user
export const getAllNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("notifications");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Sort by creation date, newest first
    const notifications = user.notifications.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json(notifications);
  } catch (err) {
    console.error('Error getting notifications:', err);
    res.status(500).json({ message: err.message });
  }
};

// Mark a notification as read
export const markNotificationRead = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const notification = user.notifications.id(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    notification.read = true;
    await user.save();

    res.json({ success: true, message: "Notification marked as read" });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ message: err.message });
  }
};

// Clear all notifications for the user
export const clearAllNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.notifications = [];
    await user.save();

    res.json({ success: true, message: "All notifications cleared" });
  } catch (err) {
    console.error('Error clearing notifications:', err);
    res.status(500).json({ message: err.message });
  }
};

// Send a notification (admin/superadmin only)
export const sendNotification = async (req, res) => {
  try {
    const { userId, message, type = 'info' } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (userId) {
      // Send to specific user
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.notifications.push({
        message,
        type,
        read: false
      });
      await user.save();
    } else {
      // Broadcast to all users
      await User.updateMany(
        {},
        {
          $push: {
            notifications: {
              message,
              type,
              read: false
            }
          }
        }
      );
    }

    // Emit real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('notification', { 
        userId: userId || 'all',
        message,
        type
      });
    }

    res.json({ 
      success: true, 
      message: `Notification sent ${userId ? 'to user' : 'to all users'}` 
    });
  } catch (err) {
    console.error('Error sending notification:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get all notifications (admin view)
export const getAllAdminNotifications = async (req, res) => {
  try {
    const users = await User.find({ 
      'notifications.0': { $exists: true } 
    }).select('name email role notifications');
    
    const allNotifications = users.flatMap(user => 
      user.notifications.map(notif => ({
        ...notif.toObject(),
        userName: user.name,
        userEmail: user.email,
        userRole: user.role
      }))
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(allNotifications);
  } catch (err) {
    console.error('Error getting admin notifications:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get notifications for a specific user (admin view)
export const getUserNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('name email role notifications');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const notifications = user.notifications
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(notif => ({
        ...notif.toObject(),
        userName: user.name,
        userEmail: user.email,
        userRole: user.role
      }));

    res.json(notifications);
  } catch (err) {
    console.error('Error getting user notifications:', err);
    res.status(500).json({ message: err.message });
  }
};