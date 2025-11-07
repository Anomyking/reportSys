import mongoose from "mongoose";

/************************************************************
 * ADMIN SUMMARY SUB-SCHEMA
 ************************************************************/
const AdminSummarySchema = new mongoose.Schema({
    // Financial Metrics
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
    
    // Audit Fields
    updatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    updatedAt: { 
        type: Date 
    },
}, { _id: false });

/************************************************************
 * MAIN REPORT SCHEMA
 ************************************************************/
const reportSchema = new mongoose.Schema({
    // Core Report Information
    title: { 
        type: String, 
        required: true,
        trim: true
    },
    description: { 
        type: String, 
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: [
            "Finance Report", 
            "Sales Report", 
            "Inventory Report", 
            "Resources Report",
            "Status Report"
        ],
        required: true 
    },
    
    // NEW: Added the urgency field to match the frontend
    urgency: {
        type: String,
        enum: ["Normal", "Urgent"],
        default: "Normal"
    },

    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    
    // Attachment Fields
    attachmentName: { 
        type: String, 
        trim: true 
    },
    attachmentPath: { 
        type: String, 
        trim: true 
    },
    attachmentMimeType: { 
        type: String 
    },

    // Review & Status Fields
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

    // Analytical Summary
    adminSummary: {
        type: AdminSummarySchema,
        default: () => ({})
    }
}, { 
    timestamps: true 
});

/************************************************************
 * MODEL EXPORT
 ************************************************************/
export default mongoose.models.Report || mongoose.model("Report", reportSchema);