// backend/controllers/authController.js

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

/************************************************************
 * LOGIN USER / ADMIN / SUPERADMIN
 ************************************************************/
export const loginUser = async (req, res) => {
  try {
    // ✅ Ensure request body exists before destructuring
    const { email, password } = req.body || {};

    // ✅ Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    // ✅ Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Validate password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ Sign JWT with user role
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Auth success response
    res.json({
      message: "✅ Login successful",
      token,
      role: user.role || "user",
      name: user.name
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
};
