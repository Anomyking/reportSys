// backend/config/initAdmin.js
import bcrypt from "bcryptjs";
import User from "../models/User.js";

export const createInitialAdmin = async () => {
  try {
    const existing = await User.findOne({ role: "superadmin" });
    if (existing) {
      console.log("🟢 Super Admin already exists:", existing.email);
      return;
    }

    const hashedPassword = await bcrypt.hash("12345", 10);
    const superAdmin = await User.create({
      name: "System Administrator",
      email: "sley@portal.com",
      password: hashedPassword,
      role: "superadmin",
    });

    console.log("✅ Super Admin account created successfully!");
    console.log("🔑 Email:", superAdmin.email);
    console.log("🔐 Password:", "12345");
  } catch (err) {
    console.error("❌ Failed to create Super Admin:", err.message);
  }
};
