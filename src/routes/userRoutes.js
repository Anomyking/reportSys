// backend/routes/userRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  requestAdminAccess,
  getNotifications,
  markNotificationAsRead,
} from "../controllers/userController.js";
import {
  createReport,
  getReports,
  getReportsByCategory,
} from "../controllers/reportController.js";

const router = express.Router();

/**
 * Request admin access
 */
router.post("/request-admin", protect, requestAdminAccess);

/**
 * User report management
 */
router.post("/reports", protect, createReport);
router.get("/reports", protect, getReports);
router.get("/reports/filter", protect, getReportsByCategory);

/**
 * User notifications
 */
router.get("/notifications", protect, getNotifications);
router.put("/notifications/:id/read", protect, markNotificationAsRead);

export default router;
