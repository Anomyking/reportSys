import File from '../models/File.js';
import User from '../models/User.js';
import { notifyUser } from '../utils/notify.js';
import { io } from '../server.js';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Upload files
export const uploadFiles = async (req, res) => {
  try {
    const { folderName, parentFolder } = req.body;
    const userId = req.user.id;

    if (folderName) {
      // Create a new folder
      const folderPath = parentFolder 
        ? path.join(uploadDir, parentFolder, folderName)
        : path.join(uploadDir, folderName);

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const folder = new File({
        userId,
        fileName: folderName,
        fileType: 'folder',
        filePath: folderPath,
        isFolder: true,
        parentFolder: parentFolder || null
      });

      await folder.save();
      return res.json({ message: 'Folder created successfully', folder });
    }

    const savedFiles = [];
    for (const file of req.files) {
      const filePath = parentFolder 
        ? path.join(uploadDir, parentFolder, file.filename)
        : path.join(uploadDir, file.filename);

      // Move the file from temp location to uploads directory
      fs.renameSync(file.path, filePath);

      const newFile = new File({
        userId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: path.relative(process.cwd(), filePath),
        isFolder: false,
        parentFolder: parentFolder || null
      });

      await newFile.save();
      savedFiles.push(newFile);
    }

    res.json({ message: 'Files uploaded successfully', files: savedFiles });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
};

// Get all files for a user
export const getUserFiles = async (req, res) => {
  try {
    const files = await File.find({ userId: req.user.id })
      .sort({ isFolder: -1, createdAt: -1 })
      .populate('sharedWith', 'name email');
    
    res.json(files);
  } catch (err) {
    console.error('Error getting files:', err);
    res.status(500).json({ message: 'Error fetching files' });
  }
};

// Delete a file or folder
export const deleteFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this file' });
    }

    // Delete from filesystem
    if (fs.existsSync(file.filePath)) {
      if (file.isFolder) {
        fs.rmSync(file.filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(file.filePath);
      }
    }

    // Delete from database
    await File.deleteOne({ _id: file._id });

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: 'Error deleting file' });
  }
};

// Share file with other users
export const shareFile = async (req, res) => {
  try {
    const { userIds } = req.body;
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to share this file' });
    }

    // Add users to sharedWith array
    file.sharedWith = [...new Set([...file.sharedWith, ...userIds])];
    await file.save();

    // Notify shared users
    for (const userId of userIds) {
      await notifyUser(userId, `${req.user.name} shared a file with you: ${file.fileName}`);
    }

    res.json({ message: 'File shared successfully', file });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).json({ message: 'Error sharing file' });
  }
};

// Search files
export const searchFiles = async (req, res) => {
  try {
    const { query } = req.query;
    
    const files = await File.find({
      userId: req.user.id,
      $or: [
        { fileName: { $regex: query, $options: 'i' } },
        { fileType: { $regex: query, $options: 'i' } }
      ]
    }).sort({ isFolder: -1, createdAt: -1 });

    res.json(files);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Error searching files' });
  }
};
