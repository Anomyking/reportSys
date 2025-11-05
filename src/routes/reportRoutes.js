// backend/routes/reportRoutes.js
import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  createReport,
  getReports,
  updateStatus,
  getReportsByCategory,
  updateAdminSummary,
} from "../controllers/reportController.js";
import upload from "../config/multerConfig.js";

const router = express.Router();

/************************************************************
 * 📨 Report Routes
 ************************************************************/

// ✅ Create new report (User)
router.post("/", protect, createReport);

// ✅ Get reports
// - Users see only their reports
// - Admin/Superadmin see all reports
router.get("/", protect, getReports);

// ✅ Filter reports by category or status
router.get("/filter", protect, getReportsByCategory);

// ✅ Create new report (User) - Use upload.single() middleware
router.post("/", protect, upload.single('attachment'), createReport);

// ✅ Admin/Superadmin update report status
router.put(
  "/:id/status",
  protect,
  authorize("admin", "superadmin"),
  updateStatus
);

// ✅ Admin/Superadmin update report summary (financial, sales, etc.)
router.put(
  "/:id/summary",
  protect,
  authorize("admin", "superadmin"),
  updateAdminSummary
);

export default router;
