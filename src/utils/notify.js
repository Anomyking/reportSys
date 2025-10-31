// backend/utils/notify.js
import User from "../models/User.js";

/************************************************************
 * 🔹 Notify all Admins (and optionally only a specific department)
 ************************************************************/
export const notifyAdmins = async (message, targetDept = null) => {
  try {
    const filter = targetDept
      ? { role: "admin", department: targetDept }
      : { role: { $in: ["admin", "superadmin"] } };

    const admins = await User.find(filter);

    if (!admins.length) return console.log("No admins found for notification.");

    const notifications = admins.map((admin) => {
      admin.notifications.push({
        message,
        read: false,
        date: new Date(),
      });
      return admin.save();
    });

    await Promise.all(notifications);
    console.log(`✅ Notified ${admins.length} admins.`);
  } catch (err) {
    console.error("Error notifying admins:", err.message);
  }
};

/************************************************************
 * 🔹 Notify a specific User (e.g., when report status changes)
 ************************************************************/
export const notifyUser = async (userId, message) => {
  try {
    const user = await User.findById(userId);
    if (!user) return console.log("User not found for notification.");

    user.notifications.push({
      message,
      read: false,
      date: new Date(),
    });

    await user.save();
    console.log(`✅ Notified user ${user.email}`);
  } catch (err) {
    console.error("Error notifying user:", err.message);
  }
};

/************************************************************
 * 🔹 Broadcast to All Users (optional feature)
 ************************************************************/
export const broadcastNotification = async (message) => {
  try {
    const users = await User.find();
    if (!users.length) return console.log("No users found for broadcast.");

    const updates = users.map((user) => {
      user.notifications.push({
        message,
        read: false,
        date: new Date(),
      });
      return user.save();
    });

    await Promise.all(updates);
    console.log(`✅ Broadcast sent to ${users.length} users.`);
  } catch (err) {
    console.error("Error broadcasting notification:", err.message);
  }
};
