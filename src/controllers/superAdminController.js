import User from "../models/User.js";
import Report from "../models/Report.js";
import Notification from "../models/Notification.js"; // Required for fetching system notifications

// Functions accessible by ONLY 'superadmin'
// ----------------------------------------------------------------

/****************************************
 * 👥 GET ALL USERS (Superadmin only)
 ****************************************/
export const getAllUsers = async (req, res) => {
    try {
        // Fetches all users, excluding sensitive fields
        const users = await User.find().select("-password -resetPasswordToken -resetPasswordExpire");
        res.json(users);
    } catch (err) {
        console.error("Error in getAllUsers:", err);
        res.status(500).json({ message: "Server error fetching users." });
    }
};

/****************************************
 * 🛠️ UPDATE USER ROLE (Superadmin only)
 ****************************************/
export const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, department } = req.body;
        const allowedRoles = ["user", "admin", "superadmin"];

        if (role && !allowedRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid role provided." });
        }

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found." });

        // Safeguard 1: Prevent superadmin from demoting themselves 
        if (user._id.toString() === req.user.id && role && role !== "superadmin") {
            return res.status(403).json({
                message: "❌ You cannot change your own superadmin role.",
            });
        }

        // Safeguard 2: Prevent removing the last superadmin
        if (user.role === "superadmin" && role && role !== "superadmin") {
            const superAdminCount = await User.countDocuments({ role: "superadmin" });
            if (superAdminCount <= 1) {
                return res.status(400).json({
                    message: "❌ Cannot demote the last superadmin.",
                });
            }
        }

        user.role = role || user.role;
        user.department = department || user.department;
        await user.save();

        // Notify user of role change
        if (role) {
            user.notifications.push({
                message: `Your role has been updated to ${role} by a superadmin.`,
            });
            await user.save();
        }

        res.json({
            message: `✅ User updated to ${user.role}`,
            user: { id: user._id, name: user.name, role: user.role, department: user.department },
        });

    } catch (err) {
        console.error("Error in updateUserRole:", err);
        res.status(500).json({ message: "Server error updating user role." });
    }
};

/****************************************
 * ❓ GET PENDING ADMIN REQUESTS
 ****************************************/
export const getPendingAdminRequests = async (req, res) => {
    try {
        const requests = await User.find({ adminRequest: "pending" }).select(
            "name email department adminRequest"
        );
        res.json(requests);
    } catch (err) {
        console.error("Error in getPendingAdminRequests:", err);
        res.status(500).json({ message: "Server error fetching admin requests." });
    }
};

/****************************************
 * ⚙️ HANDLE ADMIN REQUESTS (Approve/Reject)
 ****************************************/
export const handleAdminRequest = async (req, res) => {
    try {
        const { userId, action } = req.body; // action = 'approve' | 'reject'
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        if (action === "approve") {
            user.role = "admin";
            user.adminRequest = "approved";
            user.notifications.push({
                message: "✅ Your request to become an admin has been approved.",
            });
        } else if (action === "reject") {
            user.adminRequest = "rejected";
            user.notifications.push({
                message: "❌ Your request to become an admin has been rejected.",
            });
        } else {
            return res.status(400).json({ message: "Invalid action." });
        }

        await user.save();
        res.json({ message: `Request ${action}ed successfully.` });
    } catch (err) {
        console.error("handleAdminRequest error:", err);
        res.status(500).json({ message: "Failed to handle admin request." });
    }
};

/****************************************
 * 📢 SEND NOTIFICATION (To all or specific user)
 ****************************************/
export const sendNotification = async (req, res) => {
    try {
        const { userId, message } = req.body;

        if (!message) return res.status(400).json({ message: "Message is required." });

        if (userId === "all") {
            // Push notification to all users' notification arrays
            await User.updateMany({}, { $push: { notifications: { message } } });
            return res.json({ message: "✅ Notification sent to all users." });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        user.notifications.push({ message });
        await user.save();

        res.json({ message: `✅ Notification sent to ${user.name}.` });
    } catch (err) {
        console.error("sendNotification error:", err);
        res.status(500).json({ message: "Failed to send notification." });
    }
};

/****************************************
 * 🔔 GET ALL NOTIFICATIONS (Super Admin - System-wide view)
 ****************************************/
export const getNotifications = async (req, res) => {
    try {
        // Fetches system-level notifications
        const notifications = await Notification.find().sort({ createdAt: -1 });
        res.json(notifications);
    } catch (err) {
        console.error("Error loading notifications:", err);
        res.status(500).json({ message: "Server error loading notifications." });
    }
};