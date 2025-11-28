import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";

// 1. ALL imports from adminController.js, now including promotion/notification logic
import {
  // --- Shared Functions ---
  getOverview,
  getDepartmentReports,
  updateReportStatus,
  updateAdminSummary,
  getPromotionRequests, // <-- ADDED: Replaces 'getPendingAdminRequests'
  approvePromotion,     // <-- ADDED: Part of 'handleAdminRequest'
  rejectPromotion,      // <-- ADDED: Part of 'handleAdminRequest'

  // --- Superadmin-Only Functions ---
  getAllUsers,
  updateUserRole,
  getSystemNotifications,
  sendGlobalNotification, // <-- ADDED: Replaces 'sendNotification'
  deleteUser,
} from "../controllers/adminController.js";

const router = express.Router();

/*
 * ================================================================
 * 👑 Routes accessible by BOTH Admin and Superadmin
 * (Middleware: authorize("admin", "superadmin"))
 * ================================================================
 */
router.use(protect);
router.use(authorize("admin", "superadmin"));

// 1. Dashboard Overview
router.get("/overview", getOverview);

// 2. Fetch Reports (Departmental or All)
router.get("/reports", getDepartmentReports);

// 3. Update Report Status
router.put("/reports/:id", updateReportStatus);

// 4. Update Report Summary/Analytics
router.put("/reports/:id/summary", updateAdminSummary);

// 5. Get ALL Pending Admin Requests (This is your 'getPendingAdminRequests')
router.get("/users/requests", getPromotionRequests);

// 6. Approve an Admin Request (This is your 'handleAdminRequest' - Approve)
router.patch("/users/:id/approve", approvePromotion);

// 7. Get Admin Stats
router.get("/stats", getOverview);

// 8. Get Admin Notifications
router.get("/notifications", getSystemNotifications);

// 9. Mark all notifications as read
router.post("/notifications/read-all", async (req, res) => {
  // Implement mark all as read functionality
  res.json({ message: "All notifications marked as read" });
});

// 10. Reject an Admin Request (This is your 'handleAdminRequest' - Reject)
router.patch("/users/:id/reject", rejectPromotion);

/*
 * ================================================================
 * 🔒 Routes accessible by Superadmin ONLY
 * (Middleware: authorize("superadmin"))
 * ================================================================
 */
router.use(authorize("superadmin")); // <-- All routes below this require superadmin

// 8. View All Users
router.get("/users", getAllUsers);

// 9. Update User Role
router.put("/users/:id/role", updateUserRole);

// 10. Send Notification to all/specific user (This is your 'sendNotification')
router.post("/notifications", sendGlobalNotification);

// 8. Send Global Notifications (Superadmin only)
router.post("/notifications/global", authorize("superadmin"), sendGlobalNotification);

// 9. Delete a user (Superadmin only)
router.delete("/users/:id", authorize("superadmin"), deleteUser);

export default router;