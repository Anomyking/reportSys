// backend/routes/adminRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { adminOrSuperAdmin, superAdminOnly } from "../middleware/roleMiddleware.js";
import { updateAdminSummary } from "../controllers/reportController.js";

const router = express.Router();

/************************************************************
 * 🔹 Update Report Summary (Admin/Superadmin only)
 ************************************************************/
router.put(
  "/reports/:id/summary",
  authMiddleware,
  adminOrSuperAdmin,
  updateAdminSummary
);

/************************************************************
 * 🔹 Example: Admin Dashboard Overview (optional test route)
 ************************************************************/
router.get("/overview", authMiddleware, adminOrSuperAdmin, (req, res) => {
  res.json({ message: "✅ Admin routes working!" });
});

export default router;
