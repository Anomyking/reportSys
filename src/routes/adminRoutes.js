// backend/routes/adminRoutes.js
import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { updateAdminSummary } from "../controllers/reportController.js";

const router = express.Router();

/**
 * Update Report Summary (Admin/Superadmin only)
 */
router.put(
  "/reports/:id/summary",
  protect,
  authorize("admin", "superadmin"),
  updateAdminSummary
);

/**
 * Admin Dashboard Test Route
 */
router.get(
  "/overview",
  protect,
  authorize("admin", "superadmin"),
  (req, res) => {
    res.json({ message: "✅ Admin routes working!" });
  }
);

export default router;
