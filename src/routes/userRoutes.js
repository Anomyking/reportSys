// backend/routes/userRoutes.js (Updated)

import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
requestAdminAccess,
 getAllNotifications,
 markNotificationRead,
 clearAllNotifications,
 getProfile,
 updateProfile,
 changePassword,
 deleteAccount
} from "../controllers/userController.js";

const router = express.Router();

// ... (Other routes like Admin Request and Notifications remain unchanged) ...

// --- Profile Routes ---
router.get("/me", protect, getProfile);
router.put("/profile", protect, updateProfile);

router.put("/profile/password", protect, changePassword);
router.delete("/profile", protect, deleteAccount);

export default router;