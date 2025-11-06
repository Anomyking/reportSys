// backend/routes/userRoutes.js (Updated)

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import profileUpload from "../middleware/cloudinaryUpload.js"; // <--- Assuming the path is correct

import {
requestAdminAccess,
 getAllNotifications,
 markNotificationRead,
 clearAllNotifications,
 getProfile,
 updateProfile,
 changePassword,
 uploadProfilePhoto, // This is the controller function
 deleteAccount
} from "../controllers/userController.js";

const router = express.Router();

// ... (Other routes like Admin Request and Notifications remain unchanged) ...

// --- Profile Routes ---
router.get("/me", protect, getProfile);
router.put("/profile", protect, updateProfile);

// 📸 THE FINAL FIX FOR PROFILE PHOTO UPLOAD:
// 1. Use 'profileUpload' (the Cloudinary Multer instance)
// 2. Use 'profilePhoto' as the field name (to match client's script.js)
router.post(
    "/profile-photo", 
    protect, 
    profileUpload.single("profilePhoto"), // <--- FIXED!!!
    uploadProfilePhoto // <--- The controller that saves the URL
); 

router.put("/profile/password", protect, changePassword);
router.delete("/profile", protect, deleteAccount);

export default router;