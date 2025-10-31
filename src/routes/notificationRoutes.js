import express from "express";
import {
  getAllNotifications,
  markNotificationRead,
  clearAllNotifications,
} from "../controllers/notificationController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ Get all notifications for the logged-in user
router.get("/", authMiddleware, getAllNotifications);

// ✅ Mark a single notification as read
router.put("/:id/read", authMiddleware, markNotificationRead);

// ✅ Clear all notifications (optional)
router.delete("/clear", authMiddleware, clearAllNotifications);

export default router;
