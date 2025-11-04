import User from "../models/User.js";
import Report from "../models/Report.js";
// NOTE: You need a Notification model for the Superadmin view. 
// If you don't have one, this is a placeholder.
import Notification from "../models/Notification.js"; 

// =============================================================
// FUNCTIONS ACCESSIBLE BY BOTH 'admin' and 'superadmin'
// =============================================================

/************************************************************
 * 🔹 SYSTEM OVERVIEW (Dashboard Summary for both roles)
 ************************************************************/
export const getOverview = async (req, res) => {
    try {
        // Fetch counts for all user types and reports
        const usersCount = await User.countDocuments({ role: "user" });
        const adminsCount = await User.countDocuments({ role: { $in: ["admin", "superadmin"] } });
        const reportsCount = await Report.countDocuments();

        // Aggregate report counts by status (Pending, Approved, Rejected)
        const statusAgg = await Report.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        
        const reportStats = {};
        statusAgg.forEach((r) => (reportStats[r._id] = r.count));

        res.json({ 
            users: usersCount, 
            admins: adminsCount, 
            reports: reportsCount, 
            reportStats 
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
    try {
        const requestingUser = await User.findById(req.user.id).select("role department");
        // This findById needs to be in a try/catch, but for simplicity we'll assume the protect middleware 
        // handles the user ID validity. If the ID is invalid, it should be caught here:
        if (!requestingUser) return res.status(404).json({ message: "Admin not found." });

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
        // Added CastError check here for safety, though the token payload should be validated in middleware
        if (err.name === 'CastError' && err.path === '_id') {
            return res.status(401).json({ message: "Invalid user token/ID format." });
        }
        res.status(500).json({ message: "Failed to fetch reports." });
    }
};

/************************************************************
 * 🔹 UPDATE REPORT STATUS (Admins & Superadmins - with Department Check)
 ************************************************************/
export const updateReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (!["Pending", "Approved", "Rejected"].includes(status))
            return res.status(400).json({ message: "Invalid status." });

        const report = await Report.findById(id);
        if (!report) return res.status(404).json({ message: "Report not found." });

        const admin = await User.findById(req.user.id).select("role department");
        if (!admin) return res.status(404).json({ message: "Admin user not found." });

        // ✅ Enforce department restriction for normal admins
        if (admin.role !== "superadmin" && report.category !== admin.department)
            return res.status(403).json({ message: "You cannot modify reports outside your department." });

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
        // Added CastError check for report ID
        if (err.name === 'CastError' && err.path === '_id') {
            return res.status(400).json({ message: "Invalid Report ID format." });
        }
        res.status(500).json({ message: "Failed to update report status." });
    }
};

/************************************************************
 * 🔹 UPDATE REPORT SUMMARY (Admins & Superadmins - For Analytics)
 ************************************************************/
export const updateAdminSummary = async (req, res) => {
    try {
        const { id } = req.params;
        const { revenue, profit, inventoryValue, notes } = req.body;
        
        const report = await Report.findById(id);
        if (!report) return res.status(404).json({ message: "Report not found." });

        // Ensure numeric fields are correctly parsed (using || 0 as a safety measure)
        const numericFields = {
            revenue: parseFloat(revenue) || 0,
            profit: parseFloat(profit) || 0,
            inventoryValue: parseFloat(inventoryValue) || 0,
        };

        // Update the adminSummary sub-document
        report.adminSummary = {
            ...report.adminSummary, // Keep existing summary data
            ...numericFields,
            notes,
            updatedAt: new Date(),
            updatedBy: req.user.id,
        };

        await report.save();

        res.json({ message: "Admin summary updated successfully", report });
    } catch (err) {
        console.error("updateAdminSummary error:", err);
        
        // ✅ CRITICAL FIX: Gracefully handle the CastError (invalid ID format)
        if (err.name === 'CastError' && err.path === '_id') {
            return res.status(400).json({ message: "Invalid Report ID format. Must be a valid 24-character ID." });
        }
        
        res.status(500).json({ message: "Failed to update admin summary due to server issue." });
    }
};

// =============================================================
// 🔸 FUNCTIONS ACCESSIBLE BY 'superadmin' ONLY
// =============================================================

/************************************************************
 * 🔸 SUPERADMIN ONLY: USER MANAGEMENT
 ************************************************************/

/**
 * 🔸 Get ALL users (Superadmin-specific route)
 */
export const getAllUsers = async (req, res) => {
    try {
        // Superadmin gets all users except the currently logged-in Superadmin
        const users = await User.find({ _id: { $ne: req.user.id } }).select(
            "name email role department"
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
            return res.status(403).json({ message: "You cannot change your own role." });
        }

        // Security check: Only Superadmin can promote to or demote from 'superadmin'
        if (user.role === "superadmin" && req.user.role !== "superadmin") {
            return res.status(403).json({ message: "Only a Superadmin can modify another Superadmin's role." });
        }

        user.role = role;
        await user.save();

        res.json({ message: `User role updated to ${role}.`, user });
    } catch (err) {
        console.error("updateUserRole error:", err);
        // Added CastError check for user ID
        if (err.name === 'CastError' && err.path === '_id') {
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
 * NOTE: This requires a Notification model for system alerts.
 */
export const getSystemNotifications = async (req, res) => {
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