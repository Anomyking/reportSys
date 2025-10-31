// backend/models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // optional: empty => global
  message: String,
  read: { type: Boolean, default: false },
  date: { type: Date, default: Date.now },
});

export default mongoose.model("Notification", notificationSchema);
