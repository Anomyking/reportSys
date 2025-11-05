// backend/controllers/reportController.js
import Report from "../models/Report.js";
import { notifyAdmins, notifyUser } from "../utils/notify.js";
import { io } from "../server.js";
import path from "path"; // ✅ FIX 1: Import the 'path' module

/************************************************************
 * 🔹 Create a new report
 ************************************************************/
export const createReport = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const file = req.file;
    if (!title || !description || !category)
      return res.status(400).json({ message: "All fields are required." });

    // ✅ FIX 2: Create a data object *first*
    const reportData = {
      title,
      description,
      category,
      user: req.user.id,
      status: "Pending",
    };

    // ✅ FIX 3: Add file details to the object *before* creating
    if (file) {
      // Use path.basename to get just the unique filename
      const fileName = path.basename(file.path); 
      
      // Construct the correct public URL path.
      // server.js serves '/uploads' -> '.../uploads' folder
      // multer saves to -> '.../uploads/reports' folder
      // So, the public URL is '/uploads/reports/FILENAME'
      reportData.attachmentPath = `/uploads/reports/${fileName}`;
      reportData.attachmentName = file.originalname;
      reportData.attachmentMimeType = file.mimetype;
    }

    // Now, create the report in the database with all data
    const report = await Report.create(reportData);

    // Notifications can run after creation
    notifyAdmins?.(`📄 New ${category} report submitted by ${req.user.name}`, category);
    io.emit("reportUpdated", { message: "New report submitted" });

    res.status(201).json({ success: true, data: report });

  } catch (err) {
    // Add a console.error for better debugging on Render
    console.error("❌ CREATE REPORT FAILED:", err); 
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
    console.error("❌ GET REPORTS FAILED:", err);
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
    console.error("❌ UPDATE STATUS FAILED:", err);
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
    console.error("❌ FILTER REPORTS FAILED:", err);
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
    if (!report) return res.status(4404).json({ message: "Report not found" });

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
    console.error("❌ UPDATE SUMMARY FAILED:", err);
    res.status(500).json({ message: err.message });
  }
};