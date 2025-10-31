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

dotenv.config();

const app = express();
const server = http.createServer(app);

// ✅ Render + Local allowed origins
const FRONTEND_URLS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  process.env.FRONTEND_URL // add this in Render env
];

// ✅ CORS (simplified for deployment reliability)
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ✅ Initialize Socket.IO
export const io = new Server(server, {
  cors: {
    origin: FRONTEND_URLS,
    methods: ["GET", "POST"],
    credentials: true,
    transports: ["websocket", "polling"],
  }
});

// ✅ Middleware
app.use(express.json());

// ✅ MongoDB Connection
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

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/superadmin", superAdminRoutes);

// ✅ Health Endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server running",
    time: new Date().toISOString(),
  });
});

// ✅ Serve Frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "frontend")));

app.get("/", (req, res) => {
  res.send("Backend Server Running ✅");
});

// ✅ 404 Fallback
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
