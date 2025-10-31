// backend/controllers/authController.js
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

/************************************************************
 * REGISTER USER / ADMIN / SUPERADMIN (First only)
 ************************************************************/
export const registerUser = async (req, res) => {
  try {
    let { name, email, password, role } = req.body;

    // 🔒 Prevent users from self-registering as admin or superadmin
    if (role === "admin" || role === "superadmin") {
      return res
        .status(403)
        .json({ message: "You cannot register directly as admin or superadmin." });
    }

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered." });

    const hashed = await bcrypt.hash(password, 10);

    // ✅ Assign role safely (default = user)
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role && ["user", "admin", "superadmin"].includes(role.toLowerCase())
        ? role.toLowerCase()
        : "user",
    });

    res.status(201).json({
      message: `✅ ${user.role.toUpperCase()} registered successfully.`,
      user: { name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
};

/************************************************************
 * LOGIN USER / ADMIN / SUPERADMIN
 ************************************************************/
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid email or password" });

    // ✅ Sign JWT token with role included
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Return role explicitly
    res.json({
      message: "✅ Login successful",
      token,
      role: user.role || "user",
      name: user.name,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
};

/************************************************************
 * PROFILE
 ************************************************************/
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile." });
  }
};

/************************************************************
 * PASSWORD RESET
 ************************************************************/
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "User not found." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetURL = `https://rp-frontend.onrender.com/reset-password.html?token=${resetToken}`;
    console.log(`📧 Password reset link for ${email}: ${resetURL}`);

    res.json({
      message: "✅ Password reset link generated. Check console for link (dev mode).",
      resetURL,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error during password reset request." });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token." });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: "✅ Password reset successful. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error resetting password." });
  }
};
