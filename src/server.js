import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";

// 🧩 Local Imports
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { createInitialAdmin } from "./config/initAdmin.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";

// 🌍 Load environment variables
dotenv.config();

// ⚙️ Initialize Express + HTTP server
const app = express();
const server = http.createServer(app);

// 🌐 CORS Configuration (allow both local + deployed frontend)
const FRONTEND_URL = "https://rp-frontend-00wi.onrender.com";

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// 🧠 Initialize Socket.IO
export const io = new Server(server, {
  cors: {
    origin: [
      FRONTEND_URL,
      "http://localhost:5500",
      "http://127.0.0.1:5500",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 🧱 Middleware
app.use(express.json());

// 🧩 Connect to MongoDB
connectDB()
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
    await createInitialAdmin();
  })
  .catch((err) => console.error("❌ DB connection error:", err.message));

// ⚡ Socket.IO Events
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.emit("connectionStatus", { connected: true });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/superadmin", superAdminRoutes);

// ✅ Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// 🗂️ Serve static frontend (optional for Render)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => {
  res.redirect("/login.html");
});
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' http://127.0.0.1:5500 ws://127.0.0.1:5500;"
  );
  next();
});


// ✅ Fallback route (404)
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// 🚀 Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(` Port ${PORT} is busy, trying ${PORT + 1}...`);
    server.listen(PORT + 1);
  } else {
    console.error('❌ Server error:', err);
  }
});
