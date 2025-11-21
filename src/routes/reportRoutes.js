import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import {
  createReport,
  getReports,
  updateStatus,
  getReportsByCategory,
  updateAdminSummary,
  getReportById,
  updateReport,
  deleteReport,
  downloadReportAttachment,
} from "../controllers/reportController.js";

import reportUpload from "../config/multerConfig.js";

const router = express.Router();

/************************************************************
 * 📨 Report Routes
 ************************************************************/

// POST /api/reports/
// Create new report (User)
router.post("/", protect, reportUpload.single('attachment'), createReport); 

// GET /api/reports/
// Get all reports (filtered by user role in controller)
router.get("/", protect, getReports);

// GET /api/reports/filter
// Filter reports by category or status
router.get("/filter", protect, getReportsByCategory);


// --- NEW ROUTES TO FIX 404 ERROR ---

// GET /api/reports/:id
// Get a single report by ID (for edit modal)
router.get("/:id", protect, getReportById);

// PUT /api/reports/:id
// Update a report (for user saving edits)
router.put("/:id", protect, updateReport);

// DELETE /api/reports/:id
// Delete a report (for user deleting pending report)
router.delete("/:id", protect, deleteReport);

// --- END NEW ROUTES ---


// PUT /api/reports/:id/status
// Admin/Superadmin update report status
router.put(
  "/:id/status",
  protect,
  authorize("admin", "superadmin"),
  updateStatus
);

// PUT /api/reports/:id/summary
// Admin/Superadmin update report summary
router.put(
  "/:id/summary",
  protect,
  authorize("admin", "superadmin"),
  updateAdminSummary
);

// GET /api/reports/attachment/:id
// Download report attachment with authentication
router.get("/attachment/:id", protect, downloadReportAttachment);

export default router;