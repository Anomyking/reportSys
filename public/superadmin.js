/****************************************
 * SUPERADMIN DASHBOARD
 ****************************************/
const API_URL = window.CONFIG.API_URL;
const token = localStorage.getItem("token");
const userRole = localStorage.getItem("role");

if (!token || userRole !== "superadmin") {
    localStorage.clear();
    window.location.href = "/login.html";
}

function showAlert(msg) {
    console.error("Dashboard:", msg);
}

const formatDate = (date) => new Date(date).toLocaleString();

function getRoleBadge(role) {
    const colors = {
        superadmin: "#FF0B55",
        admin: "#CF0F47",
        user: "#777",
    };

    return `
    <span style="
      background:${colors[role]};
      color:#fff;
      padding:4px 8px;
      border-radius:6px;
      font-size:0.8rem;">
      ${role}
    </span>`;
}

/****************************************
 * Error Handler
 ****************************************/
async function handleResponseError(res) {
    let message = `Request failed (Status: ${res.status})`;

    try {
        const data = await res.json();
        message = data.message || message;
    } catch {
        message = `Internal Server Error (${res.status})`;
    }

    throw new Error(message);
}

/****************************************
 * INIT - UPDATED
 ****************************************/
document.addEventListener("DOMContentLoaded", () => {
    loadOverview();
    loadAllUsers();
    loadReports();
    loadNotifications(); // Loads personal notifications for the Superadmin user
    loadSystemNotifications(); // ✅ NEW: Loads global system alerts
});
/****************************************
 * OVERVIEW
 ****************************************/
async function loadOverview() {
    try {
        // ➡️ CORRECTED: Uses /admin/overview
        const res = await fetch(`${API_URL}/admin/overview`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw await handleResponseError(res);
        const data = await res.json();

        document.getElementById("totalUsers").textContent = data.users || 0;
        document.getElementById("totalAdmins").textContent = data.admins || 0;
        document.getElementById("totalReports").textContent = data.reports || 0;

        renderChart(data.reportStats);
    } catch (err) {
        showAlert(err.message);
    }
}

/****************************************
 * USERS
 ****************************************/
async function loadAllUsers() {
    const table = document.getElementById("usersTable");
    if (!table) return;
    table.innerHTML = `<tr><td colspan="4" style="text-align:center;">Loading...</td></tr>`;

    try {
        // ➡️ CORRECTED: Uses /admin/users (Superadmin route)
        const res = await fetch(`${API_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw await handleResponseError(res);
        const users = await res.json();

        table.innerHTML = users.length
            ? users.map((u) => `
          <tr>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${getRoleBadge(u.role)}</td>
            <td>
              ${u.role !== "superadmin"
                ? `
                  <button class="promote-btn" data-id="${u._id}" data-role="admin">Promote</button>
                  <button class="demote-btn" data-id="${u._id}" data-role="user">Demote</button>
                `
                : "—"}
            </td>
          </tr>`
            ).join("")
            : `<tr><td colspan="4" style="text-align:center;">No users found.</td></tr>`;

        document.querySelectorAll(".promote-btn").forEach((btn) =>
            btn.addEventListener("click", () =>
                updateUserRole(btn.dataset.id, btn.dataset.role)
            )
        );

        document.querySelectorAll(".demote-btn").forEach((btn) =>
            btn.addEventListener("click", () =>
                updateUserRole(btn.dataset.id, btn.dataset.role)
            )
        );

    } catch (err) {
        table.innerHTML = `<tr><td colspan="4" style="color:red;">Error: ${err.message}</td></tr>`;
        showAlert(err.message);
    }
}

async function updateUserRole(id, role) {
    try {
        // ➡️ CORRECTED: Uses /admin/users/:id/role
        const res = await fetch(`${API_URL}/admin/users/${id}/role`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ role }),
        });

        if (!res.ok) throw await handleResponseError(res);
        showAlert(`Role updated to ${role}`);
        loadAllUsers();
    } catch (err) {
        showAlert(err.message);
    }
}

/****************************************
 * REPORTS (MODIFIED)
 ****************************************/
async function loadReports() {
    const container = document.getElementById("reportsContainer");
    if (!container) return;
    container.innerHTML = `<p>Loading...</p>`;

    try {
        // ➡️ CORRECTED: Uses /admin/reports (Shared route)
        const res = await fetch(`${API_URL}/admin/reports`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw await handleResponseError(res);
        let reports = await res.json();
        if (reports.data) reports = reports.data;

        // ----------------------------------------------------
        // ⭐ NEW: Sorting Logic Implementation ⭐
        // ----------------------------------------------------
        reports.sort((a, b) => {
            const statusA = a.status;
            const statusB = b.status;
            const dateA = new Date(a.dateSubmitted || a.date); // Assuming a 'date' or 'dateSubmitted' field
            const dateB = new Date(b.dateSubmitted || b.date);

            // 1. Prioritize 'Pending' reports at the top
            if (statusA === "Pending" && statusB !== "Pending") return -1;
            if (statusA !== "Pending" && statusB === "Pending") return 1;

            // 2. If both are 'Pending' (or both are Approved/Rejected), sort by time submitted (newest first)
            // Sorting in descending order (newest date is greater, so it comes first: dateB - dateA)
            return dateB - dateA;
        });
        // ----------------------------------------------------

        container.innerHTML = reports.length
            ? reports.map((r) => `
          <div class="report-card">
            <h3>${r.title}</h3>
            <p>${r.description}</p>
            <p><strong>Category:</strong> ${r.category}</p>
            <p><strong>Status:</strong> ${r.status}</p>
            <p><small>By: ${r.user?.name || "Unknown"}</small></p>

            ${r.status === "Pending" ? `
              <button onclick="updateReportStatus('${r._id}','Approved')">Approve</button>
              <button onclick="updateReportStatus('${r._id}','Rejected')">Reject</button>
            ` : ""}
          </div>`
            ).join("")
            : "<p>No reports available.</p>";

    } catch (err) {
        container.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
        showAlert(err.message);
    }
}

/****************************************
 * NOTIFICATIONS - CORRECTED
 ****************************************/
async function loadNotifications() {
    const box = document.getElementById("notificationsList");
    if (!box) return;
    box.innerHTML = `<p>Loading...</p>`;

    try {
        // ✅ FIX: Remove the redundant '/api' from the path string.
        // Assumes API_URL already includes the base '/api' path.
        const res = await fetch(`${API_URL}/notifications/`, { 
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw await handleResponseError(res);
        let notes = await res.json();
        
        if (notes.data) notes = notes.data; 

        box.innerHTML = notes.length
            ? notes.map((n) => `
          <div class="notification ${n.read ? "" : "unread"}">
            <p>${n.message}</p>
            <small>${formatDate(n.createdAt)}</small> 
          </div>`
            ).join("")
            : "<p>No notifications.</p>";

    } catch (err) {
        box.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
        showAlert(err.message);
    }
}

/****************************************
 * SYSTEM NOTIFICATIONS (Superadmin View)
 ****************************************/
async function loadSystemNotifications() {
    // You must add an element with this ID to your HTML dashboard (e.g., <div id="systemNotificationsList"></div>)
    const box = document.getElementById("systemNotificationsList"); 
    if (!box) {
        console.warn("Element with ID 'systemNotificationsList' not found.");
        return;
    }
    box.innerHTML = `<p>Loading system alerts...</p>`;

    try {
        // ✅ Targets the Superadmin-only route for system alerts
        const res = await fetch(`${API_URL}/admin/notifications/all`, { 
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw await handleResponseError(res);
        const systemNotes = await res.json();
        
        // This is where you would process the Notification model records
        box.innerHTML = systemNotes.length
            ? systemNotes.map((n) => `
          <div class="notification system-alert ${n.read ? "" : "unread"}">
            <p>${n.message}</p>
            <small>Sent: ${formatDate(n.createdAt)} 
                ${n.target ? `(${n.target.toUpperCase()})` : ''} 
            </small> 
            </div>`
            ).join("")
            : "<p>No system-wide alerts found.</p>";

    } catch (err) {
        box.innerHTML = `<p style="color:red;">Error loading system alerts: ${err.message}</p>`;
        showAlert(`System Notifications Error: ${err.message}`);
    }
}

/****************************************
 * CHART
 ****************************************/
function renderChart(stats) {
    const ctx = document.getElementById("reportsChart");
    if (!ctx) return;

    const data = [stats.Pending || 0, stats.Approved || 0, stats.Rejected || 0];
    if (ctx._chartInstance) ctx._chartInstance.destroy();

    ctx._chartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Pending", "Approved", "Rejected"],
            datasets: [{ data, backgroundColor: ["#FFDEDE", "#FF0B55", "#CF0F47"] }],
        },
    });
}

/****************************************
 * LOGOUT
 ****************************************/
document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "/login.html";
});

console.log("Superadmin.js loaded:", API_URL);