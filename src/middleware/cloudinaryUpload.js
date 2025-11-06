import multer from "multer";
import { v2 as cloudinary } from "cloudinary"; // Import cloudinary
import { CloudinaryStorage } from "multer-storage-cloudinary"; // Import the storage engine

// 1. Configure Cloudinary using Environment Variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Define the Cloudinary Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    // This function returns the parameters for the upload
    return {
      folder: "reportsys/profiles", // Your primary folder on Cloudinary
      // Generate a unique filename based on user ID and timestamp
      public_id: `profile_${req.user.id}_${Date.now()}`,
      resource_type: "auto", // Automatically detects image/video/etc.
    };
  },
});

// 3. Configure Multer to use Cloudinary Storage
const profileUpload = multer({
  storage: storage, // <-- Use the Cloudinary storage here
  limits: { fileSize: 2 * 1024 * 1024 }, // Still 2MB limit

  // File filter remains the same
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG/PNG images allowed"));
    }
    cb(null, true);
  },
});

export default profileUpload;