import mongoose from "mongoose";

const statSchema = new mongoose.Schema(
  {
    totalRevenue: {
      type: Number,
      required: [true, "Please provide total revenue"],
    },
    totalProfit: {
      type: Number,
      required: [true, "Please provide total profit"],
    },
    totalInventory: {
      type: Number,
      required: [true, "Please provide total inventory"],
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt, perfect for your chart!
);

export default mongoose.models.Stat || mongoose.model("Stat", statSchema);