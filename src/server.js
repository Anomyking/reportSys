// backend/server.js

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

dotenv.config();

/************************************************************
 * SERVER INITIALIZATION
 ************************************************************/
const app = express();
const server = http.createServer(app);

/************************************************************
 * CORS CONFIGURATION
 ************************************************************/
const FRONTEND_URLS = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
].filter(Boolean);

console.log("🌐 Allowed origins:", FRONTEND_URLS);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (FRONTEND_URLS.includes(origin) || origin.includes("vercel.app")) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked: " + origin));
    }
  },
  credentials: true
}));

/************************************************************
 * SOCKET.IO CONFIGURATION
 ************************************************************/
export const io = new Server(server, {
  cors: {
    origin: FRONTEND_URLS,
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on("connection", socket => {
  console.log("🔌 Socket connected:", socket.id);
  socket.on("disconnect", () => console.log("❌ Socket disconnected:", socket.id));
});

/************************************************************
 * MIDDLEWARE SETUP
 ************************************************************/
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/************************************************************
 * DATABASE CONNECTION
 ************************************************************/
let isConnected = false;
async function startDB() {
  if (isConnected) return;
  await connectDB();
  await createInitialAdmin();
  isConnected = true;
  console.log("✅ Database ready");
}
startDB();

/************************************************************
 * STATIC FILE SERVING
 ************************************************************/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, "..", "public");
const uploadsPath = path.join(__dirname, "..", "uploads");

app.use(express.static(publicPath));
app.use("/uploads", express.static(uploadsPath));

/************************************************************
 * SECURITY HEADERS
 ************************************************************/
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "connect-src 'self' http://localhost:5500 http://127.0.0.1:5500 ws://localhost:5500 ws://127.0.0.1:5500 https://*; " +
    "script-src 'self' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: /uploads/; " + 
    "font-src 'self' data:; " +
    "frame-ancestors 'self';"
  );
  next();
});

/************************************************************
 * API ROUTES
 ************************************************************/
app.use("/api/auth", authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

/************************************************************
 * HEALTH CHECK
 ************************************************************/
app.get("/api/health", (_, res) =>
  res.json({ status: "OK", time: new Date() })
);

/************************************************************
 * SPA FALLBACK
 ************************************************************/
app.get("/*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(publicPath, "index.html"));
});

/************************************************************
 * ERROR HANDLING
 ************************************************************/
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.message);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

/************************************************************
 * SERVER STARTUP
 ************************************************************/
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running → http://localhost:${PORT}`)
);

export default app;