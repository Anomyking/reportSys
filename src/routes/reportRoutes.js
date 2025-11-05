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

// -----------------------------------------------------------
// FIX: Consolidate the two POST routes into one that includes 
// the file upload middleware to correctly process FormData.
// -----------------------------------------------------------

// ✅ Create new report (User) - Includes file upload middleware
router.post("/", protect, upload.single('attachment'), createReport); 

// ✅ Get reports
// - Users see only their reports
// - Admin/Superadmin see all reports
router.get("/", protect, getReports);

// ✅ Filter reports by category or status
router.get("/filter", protect, getReportsByCategory);

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