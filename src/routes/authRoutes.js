// src/routes/authRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  registerUser,
  loginUser,
  getProfile,
  forgotPassword,
  resetPassword
} from "../controllers/authController.js";

const router = express.Router();

/************************************************************
 * 👤 Public Routes (No Auth Required)
 ************************************************************/

// Register new user
router.post("/register", registerUser);

// Login user
router.post("/login", loginUser);

// Initiate password reset
router.post("/forgot-password", forgotPassword);

// Reset password using token
router.put("/reset-password/:token", resetPassword);


/************************************************************
 * 🔒 Protected Routes (Auth Required)
 ************************************************************/

// Get user profile
router.get("/profile", protect, getProfile);

export default router;
