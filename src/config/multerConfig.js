// backend/config/multerConfig.js

import multer from "multer";
import path from "path";
import fs from "fs";

/************************************************************
 * CONFIGURATION CONSTANTS
 ************************************************************/
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "reports");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
];

/************************************************************
 * DIRECTORY SETUP
 ************************************************************/
// Create upload directory if it doesn't exist
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/************************************************************
 * STORAGE CONFIGURATION
 ************************************************************/
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const fileExtension = path.extname(file.originalname);
        const fileName = `${file.fieldname}-${uniqueSuffix}${fileExtension}`;
        cb(null, fileName);
    },
});

/************************************************************
 * FILE FILTERING
 ************************************************************/
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
};

/************************************************************
 * MULTER INSTANCE
 ************************************************************/
const upload = multer({
    storage: storage,
    limits: { 
        fileSize: MAX_FILE_SIZE
    }, 
    fileFilter: fileFilter
});

export default upload;