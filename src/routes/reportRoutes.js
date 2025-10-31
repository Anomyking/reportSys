// backend/routes/reportRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  createReport,
  getReports,
  updateStatus,
  getReportsByCategory,
  updateAdminSummary,
} from "../controllers/reportController.js";


const router = express.Router();

// 🔹 Create new report (user)
router.post("/", authMiddleware, createReport);

// 🔹 Get all reports (user sees own, admin sees all)
router.get("/", authMiddleware, getReports);

// 🔹 Filter reports by category or status
router.get("/filter", authMiddleware, getReportsByCategory);

// 🔹 Update report status (admin/superadmin)
router.put("/:id/status", authMiddleware, updateStatus);

// 🔹 Admin updates report summary (financial/sales/inventory data)
router.put("/:id/summary", authMiddleware, updateAdminSummary);

export default router;
