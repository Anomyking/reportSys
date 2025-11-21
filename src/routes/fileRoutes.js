import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  uploadFiles, 
  getUserFiles, 
  deleteFile, 
  shareFile, 
  searchFiles 
} from '../controllers/fileController.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// File routes
router.post('/upload', protect, upload.array('files'), uploadFiles);
router.get('/', protect, getUserFiles);
router.delete('/:id', protect, deleteFile);
router.post('/:id/share', protect, shareFile);
router.get('/search', protect, searchFiles);

export default router;
