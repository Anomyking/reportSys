import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from 'path';
import fs from 'fs';
import {
  createReport,
  getReports,
  updateStatus,
  getReportsByCategory,
  updateAdminSummary,
  getReportById,
  updateReport,
  deleteReport,
} from "../controllers/reportController.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only document and image files are allowed'));
    }
  }
});

/************************************************************
 * 📨 Report Routes
 ************************************************************/

// POST /api/reports/
// Create new report (User) with optional file upload
router.post("/", 
  protect, 
  upload.single('attachment'), 
  (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      return res.status(400).json({ message: err.message });
    } else if (err) {
      // An unknown error occurred
      return res.status(400).json({ message: err.message });
    }
    // Everything went fine
    next();
  },
  createReport
);

// GET /api/reports/
// Get all reports (filtered by user role in controller)
router.get("/", protect, getReports);

// GET /api/reports/filter
// Filter reports by category or status
router.get("/filter", protect, getReportsByCategory);


// --- NEW ROUTES TO FIX 404 ERROR ---

// GET /api/reports/:id
// Get a single report by ID (for edit modal)
router.get("/:id", protect, getReportById);

// PUT /api/reports/:id
// Update a report (for user saving edits)
router.put("/:id", protect, updateReport);

// DELETE /api/reports/:id
// Delete a report (for user deleting pending report)
router.delete("/:id", protect, deleteReport);

// --- END NEW ROUTES ---


// PUT /api/reports/:id/status
// Admin/Superadmin update report status
router.put(
  "/:id/status",
  protect,
  authorize("admin", "superadmin"),
  updateStatus
);

// PUT /api/reports/:id/summary
// Admin/Superadmin update report summary
router.put(
  "/:id/summary",
  protect,
  authorize("admin", "superadmin"),
  updateAdminSummary
);

export default router;