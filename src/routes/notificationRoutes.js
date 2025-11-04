// backend/routes/notificationRoutes.js
import express from "express";
import {
  getAllNotifications,
  markNotificationRead,
  clearAllNotifications,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * Get all notifications for the logged-in user
 */
router.get("/", protect, getAllNotifications);

/**
 * Mark a single notification as read
 */
router.put("/:id/read", protect, markNotificationRead);

/**
 * Clear all notifications for the user
 */
router.delete("/clear", protect, clearAllNotifications);

export default router;
