import User from "../models/User.js";
import Report from "../models/Report.js";

/************************************************************
 * 🔹 Request to Become Admin
 ************************************************************/
export const requestAdminAccess = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin" || user.role === "superadmin") {
      return res.status(400).json({ message: "You are already an admin" });
    }

    if (user.adminRequest === "pending") {
      return res.status(400).json({ message: "Request already pending" });
    }

    user.adminRequest = "pending";
    await user.save();

    res.json({ message: "✅ Admin request submitted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/************************************************************
 * 🔹 Get Notifications
 ************************************************************/
export const getNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.notifications.reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/************************************************************
 * 🔹 Create New Report
 ************************************************************/
export const createReport = async (req, res) => {
  try {
    const { title, description, category } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const report = new Report({
      title,
      description,
      category,
      user: req.user.id,
      status: "Pending",
    });

    await report.save();

    res.status(201).json({
      message: "✅ Report submitted successfully!",
      report,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit report: " + err.message });
  }
};

/************************************************************
 * 🔹 Get Reports Submitted by User
 ************************************************************/
export const getUserReports = async (req, res) => {
  try {
    const reports = await Report.find({ user: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch reports: " + err.message });
  }
};


/************************************************************
 * 🔹 Mark Notification as Read
 ************************************************************/
export const markNotificationAsRead = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const note = user.notifications.id(req.params.id);
    if (!note) return res.status(404).json({ message: "Notification not found" });

    note.read = true;
    await user.save();

    res.json({ message: "✅ Notification marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
