// ✅ Live Updates with Socket.IO (Updated for Vercel)
const WS_URL = window.CONFIG.WS_URL;
const socket = io(WS_URL, { 
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// 🟢 Create Live Status Indicator
const indicator = document.createElement("div");
indicator.style.position = "fixed";
indicator.style.bottom = "15px";
indicator.style.right = "15px";
indicator.style.width = "12px";
indicator.style.height = "12px";
indicator.style.borderRadius = "50%";
indicator.style.background = "gray";
indicator.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
indicator.style.zIndex = "9999";
indicator.title = "Disconnected";
document.body.appendChild(indicator);

socket.on("connect", () => {
  indicator.style.background = "limegreen";
  indicator.title = "Connected (Live)";
  console.log("✅ Socket.IO connected");
});

socket.on("disconnect", () => {
  indicator.style.background = "gray";
  indicator.title = "Disconnected";
  console.log("❌ Socket.IO disconnected");
});

socket.on("connect_error", (error) => {
  indicator.style.background = "orange";
  indicator.title = "Connection Error";
  console.warn("⚠️ Socket.IO error:", error.message);
});

// 🔄 Event throttling (every 3s max)
let lastUpdate = 0;
const THROTTLE_TIME = 3000;

socket.on("reportUpdated", async (data) => {
  const now = Date.now();
  if (now - lastUpdate < THROTTLE_TIME) return; // throttle
  lastUpdate = now;

  console.log("🔁 Real-time update:", data.message);

  // Banner alert
  const banner = document.createElement("div");
  banner.textContent = "🔄 Reports updated — refreshing...";
  banner.style.position = "fixed";
  banner.style.top = "10px";
  banner.style.right = "10px";
  banner.style.background = "#FF0B55";
  banner.style.color = "white";
  banner.style.padding = "10px 15px";
  banner.style.borderRadius = "6px";
  banner.style.zIndex = "9999";
  banner.style.fontWeight = "bold";
  banner.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 2500);

  // Auto-refresh dashboards (if functions exist)
  try {
    if (typeof loadReports === "function") await loadReports();
    if (typeof loadReportAnalytics === "function") await loadReportAnalytics();
    if (typeof loadBentoAnalytics === "function") await loadBentoAnalytics();
    if (typeof loadAllDashboardData === "function") await loadAllDashboardData();
  } catch (err) {
    console.error("Error refreshing data:", err);
  }
});

console.log("✅ LiveUpdates.js loaded with WS_URL:", WS_URL);