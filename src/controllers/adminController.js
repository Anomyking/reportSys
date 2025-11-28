import User from "../models/User.js";
import Report from "../models/Report.js";
import Notification from "../models/Notification.js";

// =============================================================
// FUNCTIONS ACCESSIBLE BY BOTH 'admin' and 'superadmin'
// =============================================================

/************************************************************
 * 🔹 SYSTEM OVERVIEW (Dashboard Summary for both roles)
 ************************************************************/
export const getOverview = async (req, res) => {
  // ... (Your existing code is perfect, no changes)
  try {
    // Fetch counts for all user types and reports
    const usersCount = await User.countDocuments({ role: "user" });
    const adminsCount = await User.countDocuments({
      role: { $in: ["admin", "superadmin"] },
    });
    const reportsCount = await Report.countDocuments();

    // Aggregate report counts by status (Pending, Approved, Rejected)
    const statusAgg = await Report.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const reportStats = {};
    statusAgg.forEach((r) => (reportStats[r._id] = r.count));

    res.json({
      users: usersCount,
      admins: adminsCount,
      reports: reportsCount,
      reportStats,
    });
  } catch (err) {
    console.error("getOverview error:", err);
    res.status(500).json({ message: "Failed to load overview." });
  }
};

/************************************************************
 * 🔹 FETCH REPORTS (Admins & Superadmins - with Department Filter)
 ************************************************************/
export const getDepartmentReports = async (req, res) => {
  // ... (Your existing code is perfect, no changes)
  try {
    const requestingUser = await User.findById(req.user.id).select(
      "role department"
    );
    if (!requestingUser)
      return res.status(404).json({ message: "Admin not found." });

    const query = {};

    // Logic for Departmental Filtering
    if (requestingUser.role === "admin") {
      // Normal admin only sees reports matching their assigned department/category
      query.category = requestingUser.department || "General";
    }
    // Superadmin query remains empty, fetching all reports

    const reports = await Report.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.error("getDepartmentReports error:", err);
    if (err.name === "CastError" && err.path === "_id") {
      return res
        .status(401)
        .json({ message: "Invalid user token/ID format." });
    }
    res.status(500).json({ message: "Failed to fetch reports." });
  }
};

/************************************************************
 * 🔹 UPDATE REPORT STATUS (Admins & Superadmins - with Department Check)
 ************************************************************/
export const updateReportStatus = async (req, res) => {
  // ... (Your existing code is perfect, no changes)
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["Pending", "Approved", "Rejected"].includes(status))
      return res.status(400).json({ message: "Invalid status." });

    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: "Report not found." });

    const admin = await User.findById(req.user.id).select("role department");
    if (!admin)
      return res.status(404).json({ message: "Admin user not found." });

    // ✅ Enforce department restriction for normal admins
    if (admin.role !== "superadmin" && report.category !== admin.department)
      return res
        .status(403)
        .json({ message: "You cannot modify reports outside your department." });

    // Update fields
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
    if (err.name === "CastError" && err.path === "_id") {
      return res.status(400).json({ message: "Invalid Report ID format." });
    }
    res.status(500).json({ message: "Failed to update report status." });
  }
};

/************************************************************
 * 🔹 UPDATE REPORT SUMMARY (Admins & Superadmins - For Analytics)
 ************************************************************/
export const updateAdminSummary = async (req, res) => {
  // ... (Your existing code is perfect, no changes)
  try {
    const { id } = req.params;
    const { revenue, profit, inventoryValue, notes } = req.body;

    const report = await Report.findById(id);

    // 1. Handle Report Not Found
    if (!report) return res.status(404).json({ message: "Report not found." });

    // 2. ⭐ CRITICAL FIX: Initialize adminSummary if it's null/undefined.
    if (!report.adminSummary) {
      report.adminSummary = {};
    }

    // Ensure numeric fields are correctly parsed (using || 0 as a safety measure)
    const numericFields = {
      revenue: parseFloat(revenue) || 0,
      profit: parseFloat(profit) || 0,
      inventoryValue: parseFloat(inventoryValue) || 0,
    };

    // Update the adminSummary sub-document
    report.adminSummary = {
      ...report.adminSummary.toObject(), // Use toObject() for reliable merging
      ...numericFields,
      notes,
      updatedAt: new Date(),
      updatedBy: req.user.id,
    };

    // Optional: Auto-approve if a summary is created and it's pending
    if (report.status === "Pending") {
      report.status = "Approved";
      report.reviewedBy = req.user.id;
      report.reviewedAt = new Date();
    }

    await report.save();

    res.json({ message: "Admin summary updated successfully", report });
  } catch (err) {
    console.error("updateAdminSummary error:", err);

    // ✅ FIX: Handle CastError (invalid ID format) gracefully
    if (err.name === "CastError" && err.path === "_id") {
      return res.status(400).json({
        message: "Invalid Report ID format. Must be a valid 24-character ID.",
      });
    }

    res
      .status(500)
      .json({ message: "Failed to update admin summary due to server issue." });
  }
};

// =============================================================
// 🔸 NEW: USER PROMOTION REQUEST MANAGEMENT ('admin' & 'superadmin')
// =============================================================

/************************************************************
 * 🔸 Get all users who requested promotion
 ************************************************************/
export const getPromotionRequests = async (req, res, next) => {
  try {
    // Find users where adminRequest is 'pending'
    const users = await User.find({ adminRequest: "pending" }).select(
      "name email department adminRequest"
    );
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/************************************************************
 * 🔸 Approve a user's admin promotion request
 ************************************************************/
export const approvePromotion = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Check if user is superadmin (only another superadmin can do this)
    if (
      user.role === "superadmin" &&
      req.user.role !== "superadmin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to modify this user." });
    }

    user.role = "admin";
    user.adminRequest = "approved";
    user.notifications.push({
      message:
        "Congratulations! Your request for admin access has been approved.",
    });

    await user.save();
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/************************************************************
 * 🔸 Reject a user's admin promotion request
 ************************************************************/
export const rejectPromotion = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res
        .status(4404)
        .json({ success: false, message: "User not found" });
    }

    user.adminRequest = "rejected";
    user.notifications.push({
      message: "We're sorry, your request for admin access has been rejected.",
    });

    await user.save();
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// =============================================================
// 🔸 FUNCTIONS ACCESSIBLE BY 'superadmin' ONLY
// =============================================================

/************************************************************
 * 🔸 Delete a user (Superadmin only)
 ************************************************************/
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting yourself or other superadmins
    if (user.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete a superadmin' });
    }

    await User.findByIdAndDelete(req.params.id);
    
    // Optionally, you might want to clean up related data here
    // For example: Delete user's reports, notifications, etc.
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user', error: error.message });
  }
};

/************************************************************
 * 🔸 SUPERADMIN ONLY: USER MANAGEMENT
 ************************************************************/

/**
 * 🔸 Get ALL users (Superadmin-specific route)
 */
export const getAllUsers = async (req, res) => {
  // ... (Your existing code is perfect, no changes)
  try {
    // Superadmin gets all users except the currently logged-in Superadmin
    const users = await User.find({ _id: { $ne: req.user.id } }).select(
      "name email role department adminRequest" // Added adminRequest
    );
    res.json(users);
  } catch (err) {
    console.error("getAllUsers error:", err);
    res.status(500).json({ message: "Failed to fetch users." });
  }
};

/**
 * 🔸 Update a user's role (Superadmin-specific route)
 */
export const updateUserRole = async (req, res) => {
  // ... (Your existing code is perfect, no changes)
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin", "superadmin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role specified." });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Security check: Prevent the Superadmin from demoting themselves
    if (user._id.toString() === req.user.id.toString()) {
      return res
        .status(403)
        .json({ message: "You cannot change your own role." });
    }

    // Security check: Only Superadmin can promote to or demote from 'superadmin'
    if (user.role === "superadmin" && req.user.role !== "superadmin") {
      return res.status(403).json({
        message: "Only a Superadmin can modify another Superadmin's role.",
      });
    }

    user.role = role;
    // When manually changing role, we should clear any pending request
    if (user.adminRequest === "pending") {
      user.adminRequest = "none";
    }
    await user.save();

    res.json({ message: `User role updated to ${role}.`, user });
  } catch (err) {
    console.error("updateUserRole error:", err);
    if (err.name === "CastError" && err.path === "_id") {
      return res.status(400).json({ message: "Invalid User ID format." });
    }
    res.status(500).json({ message: "Failed to update user role." });
  }
};

/************************************************************
 * 🔸 SUPERADMIN ONLY: SYSTEM NOTIFICATIONS
 ************************************************************/

/**
 * 🔸 Fetch system notifications (Superadmin-specific route)
 */
export const getSystemNotifications = async (req, res) => {
  // ... (Your existing code is perfect, no changes)
  try {
    // Fetch all system-specific, non-user-attached notifications
    const notifications = await Notification.find({})
      .sort({ date: -1 })
      .limit(50);

    res.json(notifications);
  } catch (err) {
    console.error("getSystemNotifications error:", err);
    res.status(500).json({ message: "Failed to fetch system notifications." });
  }
};

/**
 * 🔸 Send a Global Notification to all users or a specific role (Superadmin-specific route)
 */
export const sendGlobalNotification = async (req, res) => {
    try {
        const { message, targetRole } = req.body;

        if (!message || !targetRole) {
            return res.status(400).json({ message: "Message and targetRole are required." });
        }

        // Validate target role
        const validRoles = ["all", "user", "admin", "superadmin"];
        if (!validRoles.includes(targetRole)) {
             return res.status(400).json({ message: "Invalid targetRole specified." });
        }

        // 1. Create System-wide Notification record
        const systemNotification = await Notification.create({
            message: message,
            target: targetRole,
            sentBy: req.user.id, // The ID of the Superadmin sending it
        });

        // 2. Prepare user update query based on targetRole
        let userUpdateQuery = {};
        if (targetRole !== "all") {
            userUpdateQuery.role = targetRole;
        }

        // 3. Push notification to the 'notifications' array of all targeted users
        const updateResult = await User.updateMany(
            userUpdateQuery,
            { $push: { notifications: { message: message, isSystem: true } } }
        );

        res.json({
            message: `Global notification sent successfully to ${updateResult.modifiedCount} user(s).`,
            notification: systemNotification,
        });

    } catch (err) {
        console.error("sendGlobalNotification error:", err);
        res.status(500).json({ message: "Failed to send global notification." });
    }
};