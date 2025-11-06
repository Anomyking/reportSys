// backend/routes/reportRoutes.js (Corrected)

import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  createReport,
  getReports,
  updateStatus,
  getReportsByCategory,
  updateAdminSummary,
} from "../controllers/reportController.js";

// 🛑 FIX 1: Remove the conflicting import that is not used by this route.
// The cloudinaryConfig is typically for profile photos, which are handled in userRoutes.js.
// import upload from "../config/cloudinaryConfig.js"; 

// ✅ FIX 2: Rename the report upload middleware to 'reportUpload' for clarity and uniqueness.
import reportUpload from "../config/multerConfig.js"; // Assuming this is your Report Attachment Middleware

const router = express.Router();

/************************************************************
 * 📨 Report Routes
 ************************************************************/

// ✅ Create new report (User) - Includes file upload middleware
// 🛑 FIX 3: Use the newly aliased variable name: 'reportUpload'.
router.post("/", protect, reportUpload.single('attachment'), createReport); 

// ✅ Get reports
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