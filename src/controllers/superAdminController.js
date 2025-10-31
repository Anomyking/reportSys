// backend/controllers/superAdminController.js
import User from "../models/User.js";

/**
 * 🔹 Get all users (for Super Admin overview)
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * 🔹 Update user role (promote/demote)
 */
export const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, department } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = role || user.role;
    user.department = department || user.department;
    await user.save();

    res.json({ message: `✅ User updated to ${role}`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
