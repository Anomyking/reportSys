import Report from "../models/Report.js";
import { notifyAdmins, notifyUser } from "../utils/notify.js";
import { io } from "../server.js";
import path from "path";

/************************************************************
 * 🔹 Create a new report
 ************************************************************/
export const createReport = async (req, res) => {
  try {
    // UPDATED: Added 'urgency' from the request body
    const { title, description, category, urgency } = req.body;
    const file = req.file;
    if (!title || !description || !category)
      return res.status(400).json({ message: "All fields are required." });

    const reportData = {
      title,
      description,
      category,
      user: req.user.id,
      status: "Pending",
      // UPDATED: Save the urgency field
      urgency: urgency || "Normal", 
    };

    if (file) {
      const fileName = path.basename(file.path); 
      reportData.attachmentPath = `/uploads/reports/${fileName}`;
      reportData.attachmentName = file.originalname;
      reportData.attachmentMimeType = file.mimetype;
    }

    const report = await Report.create(reportData);

    notifyAdmins?.(`📄 New ${category} report submitted by ${req.user.name}`, category);
    io.emit("reportUpdated", { message: "New report submitted" });

    res.status(201).json({ success: true, data: report });

  } catch (err) {
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

// NEW: Get a single report by its ID
export const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Security check: Allow admins or the user who created the report
    if (
      req.user.role !== "admin" &&
      req.user.role !== "superadmin" &&
      report.user.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(report);
  } catch (err) {
    console.error("❌ GET REPORT BY ID FAILED:", err);
    res.status(500).json({ message: err.message });
  }
};

// NEW: Update a report (by the user who created it)
export const updateReport = async (req, res) => {
  try {
    const { title, description, category, urgency } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Security check: Only the user who created it can edit
    if (report.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to update this report" });
    }

    // Logic check: Only allow edits if the report is still "Pending"
    if (report.status.toLowerCase() !== "pending") {
      return res.status(400).json({ message: "Cannot edit a report that has already been reviewed" });
    }

    // Update the fields
    report.title = title || report.title;
    report.description = description || report.description;
    report.category = category || report.category;
    report.urgency = urgency || report.urgency;

    const updatedReport = await report.save();
    res.json(updatedReport);

  } catch (err) {
    console.error("❌ UPDATE REPORT FAILED:", err);
    res.status(500).json({ message: err.message });
  }
};

// NEW: Delete a report (by the user who created it)
export const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Security check: Only the user who created it can delete
    if (report.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this report" });
    }

    // Logic check: Only allow deletion if the report is still "Pending"
    if (report.status.toLowerCase() !== "pending") {
      return res.status(400).json({ message: "Cannot delete a report that has already been reviewed" });
    }

    await Report.deleteOne({ _id: req.params.id });
    res.json({ message: "Report deleted successfully" });

  } catch (err) {
    console.error("❌ DELETE REPORT FAILED:", err);
    res.status(500).json({ message: err.message });
  }
};


/************************************************************
 * 🔹 Update Report Status (Admin)
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
    if (!report) return res.status(404).json({ message: "Report not found" }); // Corrected 4404 to 404

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