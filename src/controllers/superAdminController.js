// backend/controllers/superAdminController.js
import User from "../models/User.js";
import Report from "../models/Report.js";

/************************************************************
 * 📊 LOAD OVERVIEW
 ************************************************************/
export const loadOverview = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalAdmins = await User.countDocuments({ role: "admin" });
    const totalReports = await Report.countDocuments();

    const reportStatsArray = await Report.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const reportStats = reportStatsArray.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    res.json({
      users: totalUsers,
      admins: totalAdmins,
      reports: totalReports,
      reportStats,
    });
  } catch (err) {
    console.error("Error in loadOverview:", err);
    res.status(500).json({ message: "Server error loading dashboard overview." });
  }
};

/************************************************************
 * 👥 GET ALL USERS
 ************************************************************/
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    console.error("Error in getAllUsers:", err);
    res.status(500).json({ message: "Server error fetching users." });
  }
};

/************************************************************
 * 🛠️ UPDATE USER ROLE
 ************************************************************/
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

    // Prevent superadmin demoting themselves accidentally
    if (user._id.toString() === req.user.id && role !== "superadmin") {
      return res.status(403).json({ message: "❌ You cannot change your own superadmin role." });
    }

    // Prevent removing last superadmin
    if (user.role === "superadmin" && role !== "superadmin") {
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

    res.json({ message: `✅ User updated to ${user.role}`, user });
  } catch (err) {
    console.error("Error in updateUserRole:", err);
    res.status(500).json({ message: "Server error updating user role." });
  }
};

/************************************************************
 * 📁 GET ALL REPORTS
 ************************************************************/
export const loadReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({ data: reports });
  } catch (err) {
    console.error("Error in loadReports:", err);
    res.status(500).json({ message: "Server error fetching reports." });
  }
};

/************************************************************
 * ✅ UPDATE REPORT STATUS
 ************************************************************/
export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    const allowedStatus = ["Approved", "Rejected", "Pending"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: "Invalid status provided." });
    }

    const report = await Report.findByIdAndUpdate(
      reportId,
      { status },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found." });
    }

    res.json({
      message: `✅ Report status updated to ${report.status}`,
      report,
    });
  } catch (err) {
    console.error("Error in updateReportStatus:", err);
    res.status(500).json({ message: "Server error updating report status." });
  }
};
// ✅ Get notifications (Super Admin)
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json({ data: notifications });
  } catch (error) {
    console.error("Error loading notifications:", error);
    res.status(500).json({ message: "Server error loading notifications." });
  }
};
