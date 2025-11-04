// backend/routes/adminRoutes.js

import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js"; 

// 1. Imports from AdminController (Functions shared by Admin & Superadmin)
import {
    getOverview,             // Dashboard summary
    getDepartmentReports,    // Fetch reports with department filtering
    updateReportStatus,      // Change status (Approved/Rejected)
    updateAdminSummary       // Update financial/analytical summary data
} from "../controllers/adminController.js"; 

// 2. Imports from SuperAdminController (Functions used by Superadmin ONLY)
import {
    getAllUsers,             // View all users
    updateUserRole,          // Change user roles
    getPendingAdminRequests, // Fetch pending admin requests
    handleAdminRequest,      // Approve/Reject admin requests
    sendNotification,        // Send notifications to users/all
    getNotifications         // Fetch all system notifications
} from "../controllers/superAdminController.js";

const router = express.Router();

/*
 * Routes accessible by BOTH Admin and Superadmin
 */

// 1. Dashboard Overview
router.get(
    "/overview",
    protect,
    authorize("admin", "superadmin"),
    getOverview
);

// 2. Fetch Reports (Departmental or All)
router.get(
    "/reports",
    protect,
    authorize("admin", "superadmin"),
    getDepartmentReports
);

// 3. Update Report Status
router.put(
    "/reports/:id",
    protect,
    authorize("admin", "superadmin"),
    updateReportStatus
);

// 4. Update Report Summary/Analytics
router.put(
    "/reports/:id/summary",
    protect,
    authorize("admin", "superadmin"),
    updateAdminSummary
);

// ----------------------------------------------------------------
// 👑 Routes accessible by Superadmin ONLY
// ----------------------------------------------------------------

// 5. View All Users
router.get(
    "/users",
    protect,
    authorize("superadmin"),
    getAllUsers
);

// 6. Update User Role
router.put(
    "/users/:id/role",
    protect,
    authorize("superadmin"),
    updateUserRole
);

// 7. Get Pending Admin Requests
router.get(
    "/admin-requests/pending",
    protect,
    authorize("superadmin"),
    getPendingAdminRequests
);

// 8. Handle Admin Requests (Approve/Reject)
router.post(
    "/admin-requests/handle",
    protect,
    authorize("superadmin"),
    handleAdminRequest
);

// 9. Send Notification to all/specific user
router.post(
    "/notifications",
    protect,
    authorize("superadmin"),
    sendNotification
);

// 10. Get All System Notifications
router.get(
    "/notifications/all",
    protect,
    authorize("superadmin"),
    getNotifications
);

export default router;