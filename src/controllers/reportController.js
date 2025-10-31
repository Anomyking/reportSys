// backend/controllers/reportController.js
import Report from "../models/Report.js";
import { notifyAdmins, notifyUser } from "../utils/notify.js";
import { io } from "../server.js";

/************************************************************
 * 🔹 Create a new report
 ************************************************************/
export const createReport = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    if (!title || !description || !category)
      return res.status(400).json({ message: "All fields are required." });

    const report = await Report.create({
      title,
      description,
      category,
      user: req.user.id,
      status: "Pending",
    });

    notifyAdmins?.(`📄 New ${category} report submitted by ${req.user.name}`, category);
    io.emit("reportUpdated", { message: "New report submitted" });

    res.status(201).json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/************************************************************
 * 🔹 Get Reports
 ************************************************************/
export const getReports = async (req, res) => {
  try {
    const filter =
      req.user.role === "admin" || req.user.role === "superadmin"
        ? {}
        : { user: req.user.id };
    const reports = await Report.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/************************************************************
 * 🔹 Update Report Status
 ************************************************************/
export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const report = await Report.findById(id).populate("user", "name email");
    if (!report) return res.status(404).json({ message: "Report not found" });

    report.status = status;
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    await report.save();

    notifyUser?.(
      report.user._id,
      `📢 Your report '${report.title}' has been ${status}.`
    );
    io.emit("reportUpdated", { message: "Report status updated" });

    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/************************************************************
 * 🔹 Filter Reports
 ************************************************************/
export const getReportsByCategory = async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;

    const reports = await Report.find(filter).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/************************************************************
 * 🔹 Update Admin Summary (Financials)
 ************************************************************/
export const updateAdminSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const { revenue, profit, inventoryValue, notes } = req.body;

    const report = await Report.findById(id).populate("user", "name email");
    if (!report) return res.status(404).json({ message: "Report not found" });

    report.adminSummary = {
      revenue: Number(revenue) || 0,
      profit: Number(profit) || 0,
      inventoryValue: Number(inventoryValue) || 0,
      notes: notes || "",
      lastUpdated: new Date(),
    };

    report.status = "Approved";
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    await report.save();

    notifyUser?.(
      report.user._id,
      `📊 Your report '${report.title}' was approved and summarized by admin.`
    );
    io.emit("reportUpdated", { message: "Report summary updated" });

    res.json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
