// backend/models/Report.js

import mongoose from "mongoose";

// Define the sub-schema for the admin's analytical summary
const AdminSummarySchema = new mongoose.Schema({
    // Financial Metrics - Set explicit defaults for clean data handling
    revenue: { 
        type: Number, 
        default: 0 
    }, 
    profit: { 
        type: Number, 
        default: 0 
    }, 
    inventoryValue: { 
        type: Number, 
        default: 0 
    }, 

    // Administrative Fields
    notes: { 
        type: String, 
        trim: true, 
        default: '' 
    },
    
    // Aligns with the logic in updateAdminSummary controller:
    updatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    updatedAt: { 
        type: Date 
    },
}, { _id: false }); // Prevents Mongoose from creating an extra _id on the sub-document

const reportSchema = new mongoose.Schema({
    // Main Report Fields
    title: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    category: {
        type: String,
        enum: ["Finance Report", "Sales Report", "Inventory Report", "Resources Report"],
        required: true 
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    
    // Admin Fields handled by updateReportStatus
    status: { 
        type: String, 
        enum: ["Pending", "Approved", "Rejected"], 
        default: "Pending" 
    },
    reviewedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    },
    reviewedAt: Date,

    // ✅ Embedded Admin Summary Data
    adminSummary: {
        type: AdminSummarySchema,
        default: () => ({}) // Ensures adminSummary is always an object, ready to be updated
    },
}, { timestamps: true });


export default mongoose.models.Report || mongoose.model("Report", reportSchema);