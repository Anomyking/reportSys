// backend/routes/adminRoutes.js

import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js"; 

// 1. ALL imports now come from the consolidated adminController.js
import {
    getOverview,             // Shared
    getDepartmentReports,    // Shared
    updateReportStatus,      // Shared
    updateAdminSummary,      // Shared

    // Superadmin-Only Functions (Now imported from adminController.js)
    getAllUsers,             
    updateUserRole,          
    getSystemNotifications, // NOTE: Renamed 'getNotifications' to align with adminController.js

    // Functions that are not yet implemented in adminController.js:
    // getPendingAdminRequests, 
    // handleAdminRequest, 
    // sendNotification 
} from "../controllers/adminController.js"; 

const router = express.Router();

/*
 * Routes accessible by BOTH Admin and Superadmin (Middleware: authorize("admin", "superadmin"))
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
// 👑 Routes accessible by Superadmin ONLY (Middleware: authorize("superadmin"))
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

// 7. Get Pending Admin Requests (Controller function not yet finalized)
router.get(
    "/admin-requests/pending",
    protect,
    authorize("superadmin"),
    // You'll need to create and import a controller function here
    // e.g., getPendingAdminRequests 
    (req, res) => res.status(501).json({ message: "Admin request logic not implemented." })
);

// 8. Handle Admin Requests (Approve/Reject) (Controller function not yet finalized)
router.post(
    "/admin-requests/handle",
    protect,
    authorize("superadmin"),
    // You'll need to create and import a controller function here
    // e.g., handleAdminRequest
    (req, res) => res.status(501).json({ message: "Admin request handling logic not implemented." })
);

// 9. Send Notification to all/specific user (Controller function not yet finalized)
router.post(
    "/notifications",
    protect,
    authorize("superadmin"),
    // You'll need to create and import a controller function here
    // e.g., sendNotification
    (req, res) => res.status(501).json({ message: "Notification sending logic not implemented." })
);

// 10. Get All System Notifications
// NOTE: Renamed to match the function name we implemented: getSystemNotifications
router.get(
    "/notifications/all",
    protect,
    authorize("superadmin"),
    getSystemNotifications
);

export default router;