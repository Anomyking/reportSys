import User from "../models/User.js";
import Report from "../models/Report.js";
import mongoose from "mongoose";

/************************************************************
 * 🔹 SYSTEM OVERVIEW (Superadmin Dashboard Summary)
 ************************************************************/
export const getOverview = async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const adminsCount = await User.countDocuments({ role: { $in: ["admin", "superadmin"] } });
    const reportsCount = await Report.countDocuments();

    const statusAgg = await Report.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const reportStats = {};
    statusAgg.forEach((r) => (reportStats[r._id] = r.count));

    res.json({ users: usersCount, admins: adminsCount, reports: reportsCount, reportStats });
  } catch (err) {
    console.error("getOverview error:", err);
    res.status(500).json({ message: "Failed to load overview." });
  }
};

/************************************************************
 * 🔹 VIEW ALL USERS (Superadmin only)
 ************************************************************/
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -resetPasswordToken -resetPasswordExpire");
    res.json(users);
  } catch (err) {
    console.error("getAllUsers error:", err);
    res.status(500).json({ message: "Failed to fetch users." });
  }
};

/************************************************************
 * 🔹 UPDATE USER ROLE (Superadmin only)
 ************************************************************/
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ["user", "admin", "superadmin"];
    if (!validRoles.includes(role)) return res.status(400).json({ message: "Invalid role." });

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ message: "User not found." });

    // ✅ Prevent demoting the last superadmin
    if (target.role === "superadmin" && role !== "superadmin") {
      const superCount = await User.countDocuments({ role: "superadmin" });
      if (superCount <= 1) {
        return res.status(400).json({ message: "Cannot remove the last superadmin." });
      }
    }

    target.role = role;
    await target.save();

    // 🔔 Notify user of role change
    target.notifications.push({
      message: `Your role has been updated to ${role} by a superadmin.`,
    });
    await target.save();

    res.json({
      message: `User role updated to ${role}`,
      user: { id: target._id, name: target.name, role: target.role },
    });
  } catch (err) {
    console.error("updateUserRole error:", err);
    res.status(500).json({ message: "Failed to update role." });
  }
};

/************************************************************
 * 🔹 FETCH REPORTS (Admins & Superadmins)
 ************************************************************/
export const getDepartmentReports = async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.id);
    if (!requestingUser) return res.status(404).json({ message: "Admin not found." });

    const query = {};
    if (requestingUser.role === "admin") {
      query.category = requestingUser.department || "General";
    }

    const reports = await Report.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.error("getDepartmentReports error:", err);
    res.status(500).json({ message: "Failed to fetch reports." });
  }
};

/************************************************************
 * 🔹 UPDATE REPORT STATUS (Admins & Superadmins)
 *    Automatically notifies user about decision
 ************************************************************/
export const updateReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["Pending", "Approved", "Rejected"].includes(status))
      return res.status(400).json({ message: "Invalid status." });

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: "Report not found." });

    const admin = await User.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: "Admin not found." });

    // ✅ Enforce department restriction for normal admins
    if (admin.role !== "superadmin" && report.category !== admin.department)
      return res.status(403).json({ message: "You cannot modify this report." });

    report.status = status;
    report.reviewedBy = admin._id;
    report.reviewedAt = new Date();
    await report.save();

    // 🔔 Notify report owner
    const owner = await User.findById(report.user);
    if (owner) {
      owner.notifications.push({
        message: `Your report "${report.title}" has been ${status.toLowerCase()}.`,
      });
      await owner.save();
    }

    res.json({ message: `Report marked as ${status}`, report });
  } catch (err) {
    console.error("updateReportStatus error:", err);
    res.status(500).json({ message: "Failed to update report status." });
  }
};

/************************************************************
 * 🔹 GET PENDING ADMIN REQUESTS (Superadmin only)
 ************************************************************/
export const getPendingAdminRequests = async (req, res) => {
  try {
    const requests = await User.find({ adminRequest: "pending" }).select(
      "name email department adminRequest"
    );
    res.json(requests);
  } catch (err) {
    console.error("getPendingAdminRequests error:", err);
    res.status(500).json({ message: "Failed to fetch admin requests." });
  }
};

/************************************************************
 * 🔹 HANDLE ADMIN REQUESTS (Approve or Reject)
 ************************************************************/
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

/************************************************************
 * 🔹 SEND NOTIFICATION (Superadmin only)
 ************************************************************/
export const sendNotification = async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!message) return res.status(400).json({ message: "Message is required." });

    if (userId === "all") {
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
