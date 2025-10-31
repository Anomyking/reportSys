/************************************************************
 * ADMIN DASHBOARD SCRIPT (Final version)
 * Combines: API handling + Bento analytics + Live Socket + Manual Summary Form
 ************************************************************/

/* ----------------------- CONFIG -------------------------- */
const LOCAL_API = "http://localhost:5000/api";
const PROD_API = "https://rp-z9sk.onrender.com/api"; // Render backend URL
const API_URL = window.location.hostname.includes("localhost") ? LOCAL_API : PROD_API;
const BASE_URL = API_URL.replace("/api", ""); // for socket.io

const token = localStorage.getItem("token");
if (!token) window.location.href = "/login.html";

let refreshInterval = null;
let bentoChartInstance = null;

/* ----------------------- HELPERS ------------------------- */
function showAlert(msg) {
  alert(msg);
}

function escapeHtml(str = "") {
  return String(str).replace(/[&<>]/g, (tag) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[tag] || tag)
  );
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

async function parsePossibleWrappedResponse(res) {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text || "{}");
    if (Array.isArray(parsed)) return { ok: res.ok, data: parsed };
    if (parsed && Array.isArray(parsed.data)) return { ok: res.ok, data: parsed.data };
    return { ok: res.ok, data: parsed };
  } catch {
    return { ok: res.ok, error: "Invalid JSON", raw: text };
  }
}

/* ---------------------- SOCKET SETUP --------------------- */
const socket = io(BASE_URL, { transports: ["websocket"] });
const liveDot = document.getElementById("liveDot");
const liveText = document.getElementById("liveText");

socket.on("connect", () => {
  if (liveDot) liveDot.style.background = "limegreen";
  if (liveText) liveText.textContent = "Live Connected";
});

socket.on("disconnect", () => {
  if (liveDot) liveDot.style.background = "gray";
  if (liveText) liveText.textContent = "Disconnected";
});

/* 🔄 Throttle socket updates (max once per 3s) */
let lastUpdate = 0;
function throttle(fn) {
  const now = Date.now();
  if (now - lastUpdate >= 3000) {
    lastUpdate = now;
    fn();
  }
}

socket.on("reportUpdate", () => throttle(loadAllDashboardData));

/* --------------------- INITIAL LOAD ---------------------- */
document.addEventListener("DOMContentLoaded", () => {
  loadAllDashboardData();

  // auto-refresh every 60s
  if (!refreshInterval) {
    refreshInterval = setInterval(loadAllDashboardData, 60000);
  }

  // logout
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/login.html";
  });

  // attach summary form handler
  const summaryForm = document.getElementById("summaryForm");
  if (summaryForm) summaryForm.addEventListener("submit", handleManualSummaryForm);
});

/* ----------------- LOAD ALL DASHBOARD DATA --------------- */
async function loadAllDashboardData() {
  await Promise.all([
    loadOverview(),
    loadReports(),
    loadNotifications(),
    loadBentoAnalytics(),
  ]);
}

/* --------------------- OVERVIEW -------------------------- */
async function loadOverview() {
  try {
    const res = await fetch(`${API_URL}/admin/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const parsed = await parsePossibleWrappedResponse(res);
    if (!res.ok) throw new Error(parsed.error || "Failed to load overview");

    const reports = Array.isArray(parsed.data) ? parsed.data : [];
    document.getElementById("totalReports")?.textContent = reports.length;

    const stats = {
      Pending: reports.filter((r) => r.status === "Pending").length,
      Approved: reports.filter((r) => r.status === "Approved").length,
      Rejected: reports.filter((r) => r.status === "Rejected").length,
    };

    renderChart(stats);
  } catch (err) {
    console.error("Overview load error:", err);
  }
}

/* --------------------- REPORTS --------------------------- */
async function loadReports() {
  const container = document.getElementById("reportsContainer");
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/admin/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const parsed = await parsePossibleWrappedResponse(res);
    if (!res.ok) throw new Error(parsed.error || "Failed to fetch reports");

    const reports = Array.isArray(parsed.data) ? parsed.data : [];
    if (!reports.length) {
      container.innerHTML = "<p>No reports available.</p>";
      return;
    }

    container.innerHTML = reports
      .map(
        (r) => `
      <div class="report-card">
        <h3>${escapeHtml(r.title)}</h3>
        <p>${escapeHtml(r.description)}</p>
        <p><strong>Category:</strong> ${escapeHtml(r.category)}</p>
        <p><strong>Status:</strong> ${escapeHtml(r.status)}</p>
        <p><small>By: ${escapeHtml(r.user?.name || "Unknown")}</small></p>
        <div class="report-actions">
          ${r.status === "Pending"
            ? `<button onclick="updateReportStatus('${r._id}', 'Approved')">Approve</button>
               <button onclick="updateReportStatus('${r._id}', 'Rejected')">Reject</button>`
            : ""}
        </div>
      </div>`
      )
      .join("");
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error: ${escapeHtml(err.message)}</p>`;
  }
}

/* ----------------- REPORT STATUS UPDATE ----------------- */
async function updateReportStatus(reportId, status) {
  try {
    const res = await fetch(`${API_URL}/admin/reports/${reportId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update status");

    showAlert(`✅ Report marked as ${status}`);
    socket.emit("reportUpdate"); // trigger live refresh to all clients
    await loadAllDashboardData();
  } catch (err) {
    showAlert("❌ " + err.message);
  }
}

/* ----------------- MANUAL SUMMARY FORM ------------------ */
async function handleManualSummaryForm(e) {
  e.preventDefault();

  const id = document.getElementById("reportId").value.trim();
  const revenue = parseFloat(document.getElementById("revenue").value) || 0;
  const profit = parseFloat(document.getElementById("profit").value) || 0;
  const inventoryValue = parseFloat(document.getElementById("inventoryValue").value) || 0;
  const notes = document.getElementById("notes").value.trim();

  if (!id) return showAlert("⚠️ Please enter a valid Report ID");

  try {
    const res = await fetch(`${API_URL}/admin/reports/${id}/summary`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ revenue, profit, inventoryValue, notes }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to update summary");

    showAlert("✅ Summary updated successfully!");
    e.target.reset();
    socket.emit("reportUpdate");
    await loadAllDashboardData();
  } catch (err) {
    showAlert("❌ " + err.message);
  }
}

/* -------------------- NOTIFICATIONS --------------------- */
async function loadNotifications() {
  const container = document.getElementById("notificationsContainer");
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const parsed = await parsePossibleWrappedResponse(res);
    const notes = Array.isArray(parsed.data) ? parsed.data : [];

    container.innerHTML = notes.length
      ? notes
          .map(
            (n) => `
          <div class="notification ${n.read ? "read" : "unread"}">
            <p>${escapeHtml(n.message)}</p>
            <small>${formatDate(n.date)}</small>
          </div>`
          )
          .join("")
      : "<p>No notifications.</p>";
  } catch (err) {
    console.error("Notifications error:", err);
  }
}

/* -------------------- REPORTS CHART --------------------- */
function renderChart(stats) {
  const ctx = document.getElementById("reportsChart");
  if (!ctx) return;

  if (ctx._chartInstance) ctx._chartInstance.destroy();

  ctx._chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Pending", "Approved", "Rejected"],
      datasets: [
        {
          data: [stats.Pending, stats.Approved, stats.Rejected],
          backgroundColor: ["#FFDEDE", "#FF0B55", "#CF0F47"],
        },
      ],
    },
  });
}

/* ------------------ BENTO ANALYTICS --------------------- */
async function loadBentoAnalytics() {
  try {
    const res = await fetch(`${API_URL}/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const parsed = await parsePossibleWrappedResponse(res);
    const reports = Array.isArray(parsed.data) ? parsed.data : [];

    const approved = reports.filter((r) => r.status === "Approved" && r.adminSummary);
    const totalRevenue = approved.reduce((s, r) => s + (r.adminSummary.revenue || 0), 0);
    const totalProfit = approved.reduce((s, r) => s + (r.adminSummary.profit || 0), 0);
    const totalInventory = approved.reduce((s, r) => s + (r.adminSummary.inventoryValue || 0), 0);

    document.getElementById("totalRevenue").textContent = "$" + totalRevenue.toLocaleString();
    document.getElementById("totalProfit").textContent = "$" + totalProfit.toLocaleString();
    document.getElementById("totalInventory").textContent = "$" + totalInventory.toLocaleString();

    renderBentoTrendChart(approved);
  } catch (err) {
    console.error("Bento analytics error:", err);
  }
}

/* Render bento trend chart */
function renderBentoTrendChart(reports) {
  const ctx = document.getElementById("bentoTrendChart");
  if (!ctx) return;

  const labels = reports.map((r) =>
    r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString() : ""
  );
  const revenue = reports.map((r) => r.adminSummary.revenue || 0);
  const profit = reports.map((r) => r.adminSummary.profit || 0);
  const inventory = reports.map((r) => r.adminSummary.inventoryValue || 0);

  if (bentoChartInstance) bentoChartInstance.destroy();

  bentoChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "Revenue", data: revenue, borderColor: "#FF0B55", fill: false },
        { label: "Profit", data: profit, borderColor: "#CF0F47", fill: false },
        { label: "Inventory", data: inventory, borderColor: "#FF7B9E", fill: false },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true } },
    },
  });
}
