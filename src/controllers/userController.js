import User from "../models/User.js";
import Report from "../models/Report.js";
import bcrypt from "bcryptjs";

/************************************************************
 * Get Profile
 ************************************************************/
export const getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  res.json(user);
};

/************************************************************
 * Update Profile
 ************************************************************/
export const updateProfile = async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) return res.status(404).json({ message: "User not found" });

  const { name, email } = req.body;

  if (name) user.name = name;
  if (email) user.email = email;

  await user.save();

  res.json({ message: "✅ Profile updated", user });
};

/************************************************************
 * Change Password
 ************************************************************/
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) return res.status(404).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "✅ Password updated successfully" });
};

/************************************************************
 * Delete Account
 ************************************************************/
export const deleteAccount = async (req, res) => {
  await User.findByIdAndDelete(req.user.id);
  res.json({ message: "🗑️ Account deleted successfully" });
};

/************************************************************
 * Request Admin Access
 ************************************************************/
export const requestAdminAccess = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (["admin", "superadmin"].includes(user.role)) {
      return res.status(400).json({ message: "You already have admin privileges" });
    }

    if (user.adminRequest === "pending") {
      return res.status(400).json({ message: "Your request is already pending" });
    }

    user.adminRequest = "pending";
    user.notifications.push({
      message: "✅ Your admin request has been submitted."
    });

    await user.save();

    res.json({ message: "✅ Admin request submitted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/************************************************************
 * Get All Notifications
 ************************************************************/
export const getAllNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.notifications.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/************************************************************
 * Mark Notification Read
 ************************************************************/
export const markNotificationRead = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const notification = user.notifications.id(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    notification.read = true;
    await user.save();

    res.json({ message: "✅ Notification marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/************************************************************
 * Clear All Notifications
 ************************************************************/
export const clearAllNotifications = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { notifications: [] });
    res.json({ message: "🧹 All notifications cleared" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
