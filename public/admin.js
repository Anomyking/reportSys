/************************************************************
 * ADMIN DASHBOARD SCRIPT (Consolidated)
 * Combines: Config, API handling, Socket, Analytics, and Forms
 ************************************************************/

/* ----------------------- CONFIG -------------------------- */
const API_URL = window.CONFIG.API_URL;
const BASE_URL = window.CONFIG.BASE_URL;

const token = localStorage.getItem("token");
// Redirect if not logged in or role check (optional, better handled by backend/router protection)
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
        // Handle common API response formats (plain array, or { data: array })
        const parsed = JSON.parse(text || "{}"); 
        if (Array.isArray(parsed)) return { ok: res.ok, data: parsed };
        if (parsed && Array.isArray(parsed.data)) return { ok: res.ok, data: parsed.data };
        return { ok: res.ok, data: parsed };
    } catch {
        // Return raw text if parsing fails (e.g., non-JSON error response)
        return { ok: res.ok, error: "Invalid JSON response from server", raw: text };
    }
}

/* ---------------------- SOCKET SETUP --------------------- */
// Initializes the socket connection
const socket = io(BASE_URL, { transports: ["websocket", "polling"] });
const liveDot = document.getElementById("liveDot");
const liveText = document.getElementById("liveText");

socket.on("connect", () => {
    if (liveDot) liveDot.style.background = "limegreen";
    if (liveText) liveText.textContent = "Live Connected";
    console.log("✅ Socket connected");
});

socket.on("disconnect", () => {
    if (liveDot) liveDot.style.background = "gray";
    if (liveText) liveText.textContent = "Disconnected";
    console.log("❌ Socket disconnected");
});

socket.on("connect_error", (error) => {
    console.warn("⚠️ Socket connection error:", error.message);
    if (liveDot) liveDot.style.background = "orange";
    if (liveText) liveText.textContent = "Connection Issues";
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

// Listener for report updates from the backend
socket.on("reportUpdate", () => throttle(loadAllDashboardData));

/* --------------------- INITIAL LOAD ---------------------- */
document.addEventListener("DOMContentLoaded", () => {
    loadAllDashboardData();

    // Set up auto-refresh every 60s
    if (!refreshInterval) {
        refreshInterval = setInterval(loadAllDashboardData, 60000);
    }

    // Logout handler
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "/login.html";
    });

    // Attach summary form handler
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
        // Uses consolidated /admin route
        const res = await fetch(`${API_URL}/admin/overview`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const parsed = await parsePossibleWrappedResponse(res);
        if (!res.ok) throw new Error(parsed.error || "Failed to load overview");

        // Note: The /admin/overview endpoint should return counts, not an array of reports.
        // If it returns counts, update the logic below:
        // const totalReportsEl = document.getElementById("totalReports");
        // if (totalReportsEl) totalReportsEl.textContent = parsed.data.reports;
        
        // Temporarily using the Reports endpoint to calculate stats until overview is fixed:
        const reportsRes = await fetch(`${API_URL}/admin/reports`, { headers: { Authorization: `Bearer ${token}` } });
        const reportsParsed = await parsePossibleWrappedResponse(reportsRes);
        const reports = Array.isArray(reportsParsed.data) ? reportsParsed.data : [];

        const totalReportsEl = document.getElementById("totalReports");
        if (totalReportsEl) totalReportsEl.textContent = reports.length;

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
        // Uses consolidated /admin route for department reports
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
window.updateReportStatus = async function(reportId, status) {
    try {
        // Uses consolidated /admin route for updating status
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
};

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
        // Uses consolidated /admin route for updating summary
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
        // NOTE: This route should fetch USER-SPECIFIC notifications (since this is the Admin Dashboard)
        // If this route is intended for Superadmin's system alerts, it should be: /admin/notifications/all
        // Assuming it fetches the authenticated user's (Admin) notifications:
        const res = await fetch(`${API_URL}/notifications`, { 
            headers: { Authorization: `Bearer ${token}` },
        });
        const parsed = await parsePossibleWrappedResponse(res);
        // Assuming the backend returns an array of notifications in `parsed.data` or just `parsed`
        const notes = Array.isArray(parsed.data) ? parsed.data : (Array.isArray(parsed) ? parsed : []);

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
        // NOTE: Using /admin/reports to get data. This ensures the Admin only sees their department's data.
        const res = await fetch(`${API_URL}/admin/reports`, { 
            headers: { Authorization: `Bearer ${token}` },
        });
        const parsed = await parsePossibleWrappedResponse(res);
        const reports = Array.isArray(parsed.data) ? parsed.data : [];

        const approved = reports.filter((r) => r.status === "Approved" && r.adminSummary);
        const totalRevenue = approved.reduce((s, r) => s + (r.adminSummary.revenue || 0), 0);
        const totalProfit = approved.reduce((s, r) => s + (r.adminSummary.profit || 0), 0);
        const totalInventory = approved.reduce((s, r) => s + (r.adminSummary.inventoryValue || 0), 0);

        const revenueEl = document.getElementById("totalRevenue");
        const profitEl = document.getElementById("totalProfit");
        const inventoryEl = document.getElementById("totalInventory");

        if (revenueEl) revenueEl.textContent = "$" + totalRevenue.toLocaleString();
        if (profitEl) profitEl.textContent = "$" + totalProfit.toLocaleString();
        if (inventoryEl) inventoryEl.textContent = "$" + totalInventory.toLocaleString();

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

console.log("✅ Admin.js loaded with API_URL:", API_URL);