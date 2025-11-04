// backend/models/Notification.js

import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    // User this notification is intended for. 
    // If null/undefined, it's considered a system/global notification (for superadmin to review).
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: false 
    }, 
    
    // Who generated the alert (e.g., the system, or a specific user requesting admin access)
    // This is useful for the Superadmin to track user activity.
    // If type is 'AdminRequest', this refers to the user making the request.
    sender: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: false 
    }, 
    
    message: { 
        type: String, 
        required: true 
    },
    
    // Optional: Helps categorize the notification (e.g., 'system', 'report_update', 'admin_request')
    type: {
        type: String,
        enum: ['system', 'admin_request', 'report_update', 'general'],
        default: 'general'
    },
    
    read: { 
        type: Boolean, 
        default: false 
    },
    
    // Renamed from 'date' to 'createdAt' for Mongoose consistency
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
});

// We use the 'Notification' model primarily for system-wide alerts (like Admin Requests)
// User-specific notifications are usually embedded in the User model itself (as seen in your controllers).
export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);