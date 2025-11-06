// backend/config/cloudinaryConfig.js

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary (ensure CLOUDINARY_CLOUD_NAME, API_KEY, and API_SECRET are in your .env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage
const profileStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "reportsys/profile_photos", // Folder name in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [{ width: 500, height: 500, crop: "fill" }]
    },
});

// Create Multer instance for profile photos
const uploadProfilePhoto = multer({ 
    storage: profileStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Max 2MB for profile photo
});

export default uploadProfilePhoto;