// backend/routes/notificationRoutes.js
import express from "express";
import {
  getAllNotifications,
  markNotificationRead,
  clearAllNotifications,
  sendNotification,
  getAllAdminNotifications,
  getUserNotifications
} from "../controllers/notificationController.js";
import { protect, admin, superadmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// User routes
router.get("/", protect, getAllNotifications);
router.put("/:id/read", protect, markNotificationRead);
router.delete("/clear", protect, clearAllNotifications);

// Admin routes
router.get("/admin/all", protect, admin, getAllAdminNotifications);
router.get("/user/:userId", protect, admin, getUserNotifications);

// Superadmin routes
router.post("/send", protect, superadmin, sendNotification);

export default router;
