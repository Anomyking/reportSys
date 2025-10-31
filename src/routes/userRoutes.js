// backend/routes/userRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
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

/************************************************************
 * 🔹 ADMIN ACCESS REQUEST
 ************************************************************/
router.post("/request-admin", authMiddleware, requestAdminAccess);

/************************************************************
 * 🔹 REPORT MANAGEMENT (User)
 ************************************************************/
router.post("/reports", authMiddleware, createReport);
router.get("/reports", authMiddleware, getReports);
router.get("/reports/filter", authMiddleware, getReportsByCategory);

/************************************************************
 * 🔹 USER NOTIFICATIONS
 ************************************************************/
router.get("/notifications", authMiddleware, getNotifications);
router.put("/notifications/:id/read", authMiddleware, markNotificationAsRead);

export default router;
