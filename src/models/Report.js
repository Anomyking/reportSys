// backend/models/Report.js
import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  title: String,
  description: String,
  category: {
    type: String,
    enum: ["Finance Report", "Sales Report", "Inventory Report", "Resources Report"],
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,

  // ✅ Admin-added summary data
  adminSummary: {
    revenue: Number,         // for Sales
    profit: Number,          // for Finance
    inventoryValue: Number,  // for Inventory
    notes: String,           // optional remarks
    lastUpdated: Date,
  },
}, { timestamps: true });

export default mongoose.models.Report || mongoose.model("Report", reportSchema);
