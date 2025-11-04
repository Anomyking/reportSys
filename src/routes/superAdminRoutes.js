import express from "express";
import {
  getOverview,
  getAllUsers,
  updateUserRole,
  getPendingAdminRequests,
  handleAdminRequest,
  sendNotification,
} from "../controllers/adminController.js";
import { loadReports } from '../controllers/superAdminController.js';
import { authMiddleware } from "../middleware/authMiddleware.js";
import { superAdminOnly } from "../middleware/roleMiddleware.js";

const router = express.Router();

/************************************************************
 * 🔹 SUPERADMIN DASHBOARD ROUTES
 ************************************************************/

// ✅ Get system overview (users, reports, stats)
router.get("/overview", authMiddleware, superAdminOnly, getOverview);

// ✅ Get all users
router.get("/users", authMiddleware, superAdminOnly, getAllUsers);

// ✅ Update user role
router.put("/role/:id", authMiddleware, superAdminOnly, updateUserRole);

// ✅ Get pending admin requests
router.get("/admin-requests", authMiddleware, superAdminOnly, getPendingAdminRequests);

// ✅ Handle admin access requests (approve/reject)
router.post("/admin-requests/handle", authMiddleware, superAdminOnly, handleAdminRequest);

router.get('/reports', loadReports);
// ✅ Send notifications to one or all users
router.post("/notify", authMiddleware, superAdminOnly, sendNotification);

export default router;
