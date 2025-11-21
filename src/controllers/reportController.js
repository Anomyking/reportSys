import Report from "../models/Report.js";
import User from "../models/User.js";
import { notifyAdmins, notifyUser } from "../utils/notify.js";
import { io } from "../server.js";

/************************************************************
 * 🔹 Create a new report
 ************************************************************/
export const createReport = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Files:', req.file);
    
    // For form-data, we need to access fields directly from req.body
    const { title, description, category, urgency } = req.body;
    
    if (!title || !description || !category) {
      console.error('Missing required fields:', { title, description, category });
      return res.status(400).json({ 
        message: "All fields are required.",
        receivedData: { title, description, category, urgency }
      });
    }

    const reportData = {
      title: title.toString().trim(),
      description: description.toString().trim(),
      category: category.toString().trim(),
      user: req.user.id,
      status: "Pending",
      urgency: (urgency || "Normal").toString().trim()
    };
    
    // Handle file upload if present
    if (req.file) {
      reportData.attachmentPath = `/uploads/${req.file.filename}`;
      reportData.attachmentName = req.file.originalname;
      reportData.attachmentMimeType = req.file.mimetype;
      console.log('File attached:', reportData.attachmentName);
    }

    const report = await Report.create(reportData);

    try {
      // Notify all admins and superadmins about the new report
      await notifyAdmins(
        `📄 New ${category} report submitted by ${req.user.name}: ${title}`,
        category
      );
      
      // Also notify superadmins specifically
      const superAdmins = await User.find({ role: 'superadmin' });
      await Promise.all(
        superAdmins.map(admin => 
          notifyUser(
            admin._id, 
            `📢 New ${category} report requires review: ${title}`
          )
        )
      );
      
      io.emit("reportUpdated", { 
        type: 'new_report',
        message: `New ${category} report submitted`,
        reportId: report._id,
        category,
        urgency: urgency || 'Normal'
      });
    } catch (notifyErr) {
      console.error('Error sending notifications:', notifyErr);
      // Don't fail the request if notification fails
    }

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
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if the user is the owner of the report
    if (report.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this report' });
    }

    // If there's an attachment, delete it from storage
    if (report.attachmentPath) {
      // Delete the file from the filesystem or cloud storage
      const filePath = path.join(__dirname, '..', report.attachmentPath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Report.findByIdAndDelete(req.params.id);
    res.json({ message: 'Report deleted successfully' });
  } catch (err) {
    console.error('Error deleting report:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Download a report attachment
 * @route GET /api/reports/attachment/:id
 * @access Private
 */
export const downloadReportAttachment = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    // Check if the user is authorized to view this report
    if (req.user.role !== 'admin' && 
        req.user.role !== 'superadmin' && 
        report.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this file' });
    }

    // Check if the report has an attachment
    if (!report.attachmentPath) {
      return res.status(404).json({ message: 'No attachment found for this report' });
    }

    // If the attachment is stored in Cloudinary (URL starts with http)
    if (report.attachmentPath.startsWith('http')) {
      return res.redirect(report.attachmentPath);
    }

    // For local file storage
    const filePath = path.join(__dirname, '..', report.attachmentPath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${report.attachmentName || 'report_attachment'}"`);
    res.setHeader('Content-Type', report.attachmentMimeType || 'application/octet-stream');
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (err) {
    console.error('Error downloading file:', err);
    res.status(500).json({ message: 'Error downloading file' });
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