import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  requestAdminAccess,
  getAllNotifications,
  markNotificationRead,
  clearAllNotifications,
} from "../controllers/userController.js";

import upload from "../middleware/uploadMiddleware.js";
import {
  getProfile,
  updateProfile,
  changePassword,
  uploadProfilePhoto,
  deleteAccount
} from "../controllers/userController.js";


import {
  createReport,
  getReports,
  getReportsByCategory
} from "../controllers/reportController.js";

const router = express.Router();

// Admin Request
router.post("/request-admin", protect, requestAdminAccess);

// Reports
router.post("/reports", protect, createReport);
router.get("/reports", protect, getReports);
router.get("/reports/filter/:category", protect, getReportsByCategory);

// Notifications
router.get("/notifications", protect, getAllNotifications);
router.put("/notifications/:id/read", protect, markNotificationRead);
router.delete("/notifications/clear", protect, clearAllNotifications);

// Profile routes
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.put("/profile/password", protect, changePassword);
router.put("/profile/photo", protect, upload.single("photo"), uploadProfilePhoto);
router.delete("/profile", protect, deleteAccount);


export default router;
