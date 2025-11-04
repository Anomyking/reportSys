// backend/routes/userRoutes.js

import express from "express";
import { protect } from "../middleware/authMiddleware.js";

// Import notification controllers
import {
    getAllNotifications,
    markNotificationRead,
    clearAllNotifications,
} from "../controllers/notificationController.js"; 

// Import user-specific controllers
import {
    requestAdminAccess,
} from "../controllers/userController.js";

// Import report controllers
import {
    createReport,
    getReports, // ✅ FIX: Using 'getReports' to match the likely export name in reportController.js
    getReportsByCategory,
} from "../controllers/reportController.js";

const router = express.Router();

/**
 * 👤 User Profile Management
 */
// 1. Request admin access
router.post("/request-admin", protect, requestAdminAccess);

/**
 * 📝 User Report Management
 * All routes use 'protect' to ensure the user only interacts with their own reports
 */
// 2. Create a new report
router.post("/reports", protect, createReport); 
// 3. Get all reports for the logged-in user
router.get("/reports", protect, getReports); 
// 4. Filter reports by category (using URL parameter)
router.get("/reports/filter/:category", protect, getReportsByCategory);


/**
 * 🔔 User Notifications
 */
// 5. Get all notifications for the user
router.get("/notifications", protect, getAllNotifications); 
// 6. Mark a specific notification as read
router.put("/notifications/:id/read", protect, markNotificationRead);
// 7. Clear all notifications
router.delete("/notifications/clear", protect, clearAllNotifications); 


export default router;