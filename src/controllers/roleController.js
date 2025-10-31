import User from "../models/User.js";

// ✅ Superadmin can promote/demote any user
export const updateUserRole = async (req, res) => {
  try {
    const superAdmin = await User.findById(req.user.id);
    if (!superAdmin || superAdmin.role !== "superadmin")
      return res.status(403).json({ message: "Access denied" });

    const { userId, newRole, department } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = newRole;
    user.department = department || user.department;
    await user.save();

    res.json({ message: `User promoted to ${newRole}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
