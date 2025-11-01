import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";

// Local imports
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { createInitialAdmin } from "./config/initAdmin.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// ✅ Allowed frontend origins (local + Render domain)
const FRONTEND_URLS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://reportsys.onrender.com",   // ✅ Your Render site
  process.env.FRONTEND_URL
].filter(Boolean);

// ✅ CORS settings
app.use(cors({
  origin: FRONTEND_URLS,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ✅ Socket.io
export const io = new Server(server, {
  cors: {
    origin: FRONTEND_URLS,
    methods: ["GET", "POST"],
  }
});

// ✅ Middleware
app.use(express.json());

// ✅ MongoDB connection
connectDB()
  .then(async () => {
    console.log("✅ MongoDB connected");
    await createInitialAdmin();
  })
  .catch((err) => console.error("❌ DB Error:", err.message));

// ✅ Socket Events
io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);
  socket.emit("connectionStatus", { connected: true });
  socket.on("disconnect", () => console.log(`❌ Socket disconnected: ${socket.id}`));
});

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/superadmin", superAdminRoutes);

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server running", time: new Date().toISOString() });
});

// ✅ Serve frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

// ✅ Serve index.html for root
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// ✅ Catch-all for frontend routing
app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
