import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { GridFsStorage } from 'multer-gridfs-storage';
import crypto from 'crypto';
import path from 'path';

export let gfs;
let gridFSBucket;

// Initialize GridFS stream
export const initGridFS = (connection) => {
  gfs = new mongoose.mongo.GridFSBucket(connection.db, {
    bucketName: 'uploads'
  });
  return gfs;
};

// Get GridFS bucket
export const getBucket = () => {
  if (!gridFSBucket) {
    const conn = mongoose.connection;
    gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db, {
      bucketName: 'uploads'
    });
  }
  return gridFSBucket;
};

// Create storage engine
const storage = new GridFsStorage({
  db: mongoose.connection,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads',
          metadata: {
            originalName: file.originalname,
            userId: req.user?.id || 'anonymous',
            fileType: file.mimetype
          }
        };
        resolve(fileInfo);
      });
    });
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    // Accept images and documents
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

export default upload;
