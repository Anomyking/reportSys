import mongoose from "mongoose";

// ✅ Subschema for notifications
const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    date: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
  },
  { _id: false }
);

// ✅ Main user schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["user", "admin", "superadmin"],
      default: "user",
    },
    profilePhoto: {
      type: String,
      default: "/uploads/profile/default.png"
},

    department: {
      type: String,
      default: "General",
    },
    adminRequest: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },

    notifications: [notificationSchema],
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
