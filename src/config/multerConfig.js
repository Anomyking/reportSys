// backend/config/multerConfig.js

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configuration is shared with profile upload
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Define a separate storage engine for report files
const reportStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: (req, file) => {
        return {
            folder: "reportsys/report_attachments", // New folder for report files
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'docx', 'xlsx', 'txt'], // Add more types for reports
            resource_type: "auto",
        };
    },
});

// Create Multer instance for report attachments
const uploadReportAttachment = multer({ 
    storage: reportStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for reports (adjust as needed)
});

// 💡 Export this instance as the default export.
export default uploadReportAttachment;