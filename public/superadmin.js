/************************************************************
 * SUPERADMIN DASHBOARD (Updated for Vercel)
 ************************************************************/
const API_URL = window.CONFIG.API_URL;
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/login.html";
}

function showAlert(msg, type = "info") {
  alert(msg);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

function getRoleBadge(role) {
  const colors = {
    superadmin: "#FF0B55",
    admin: "#CF0F47",
    user: "#777",
  };
  return `<span style="background:${colors[role]}; color:#fff; padding:4px 8px; border-radius:6px; font-size:0.8rem;">${role}</span>`;
}

document.addEventListener("DOMContentLoaded", () => {
  loadOverview();
  loadAllUsers();
  loadReports();
  loadNotifications();
});

/************************************************************
 * LOAD OVERVIEW
 ************************************************************/
async function loadOverview() {
  try {
    const res = await fetch(`${API_URL}/superadmin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    const totalUsersEl = document.getElementById("totalUsers");
    const totalAdminsEl = document.getElementById("totalAdmins");
    const totalReportsEl = document.getElementById("totalReports");

    if (totalUsersEl) totalUsersEl.textContent = data.users;
    if (totalAdminsEl) totalAdminsEl.textContent = data.admins;
    if (totalReportsEl) totalReportsEl.textContent = data.reports;

    renderChart(data.reportStats);
  } catch (err) {
    console.error("Overview load error:", err.message);
  }
}

/************************************************************
 * LOAD ALL USERS
 ************************************************************/
async function loadAllUsers() {
  const usersTable = document.getElementById("usersTable");
  if (!usersTable) return;

  try {
    const res = await fetch(`${API_URL}/superadmin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const users = await res.json();

    if (!res.ok) throw new Error("Failed to load users");

    usersTable.innerHTML = users
      .map(
        (u) => `
        <tr>
          <td>${u.name}</td>
          <td>${u.email}</td>
          <td>${getRoleBadge(u.role)}</td>
          <td>
            ${
              u.role !== "superadmin"
                ? `
            <button class="promote-btn" data-id="${u._id}" data-role="admin">Promote</button>
            <button class="demote-btn" data-id="${u._id}" data-role="user">Demote</button>
            `
                : `<span style="color:#999;">—</span>`
            }
          </td>
        </tr>`
      )
      .join("");

    document.querySelectorAll(".promote-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        updateUserRole(btn.dataset.id, btn.dataset.role)
      );
    });

    document.querySelectorAll(".demote-btn").forEach((btn) => {
      btn.addEventListener("click", () =>
        updateUserRole(btn.dataset.id, btn.dataset.role)
      );
    });
  } catch (err) {
    console.error("Error loading users:", err.message);
    if (usersTable) {
      usersTable.innerHTML = `<tr><td colspan="4" style="color:red;">Error: ${err.message}</td></tr>`;
    }
  }
}

/************************************************************
 * UPDATE USER ROLE
 ************************************************************/
async function updateUserRole(userId, newRole) {
  try {
    const res = await fetch(`${API_URL}/superadmin/role/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ role: newRole }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    showAlert(`✅ User role updated to ${newRole}`);
    loadAllUsers();
  } catch (err) {
    showAlert("Error updating role: " + err.message);
  }
}

/************************************************************
 * LOAD REPORTS
 ************************************************************/
async function loadReports() {
  const reportsContainer = document.getElementById("reportsContainer");
  if (!reportsContainer) return;

  try {
    const res = await fetch(`${API_URL}/admin/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    let reports = await res.json();
    
    // Handle wrapped response
    if (reports.data && Array.isArray(reports.data)) {
      reports = reports.data;
    }

    if (!res.ok) throw new Error("Failed to load reports");

    reportsContainer.innerHTML = reports.length
      ? reports
          .map(
            (r) => `
          <div class="report-card">
            <h3>${r.title}</h3>
            <p>${r.description}</p>
            <p><strong>Category:</strong> ${r.category}</p>
            <p><strong>Status:</strong> ${r.status}</p>
            <p><small>Submitted by: ${r.user?.name || "Unknown"}</small></p>
            <div class="report-actions">
              ${r.status === "Pending" ? `
                <button onclick="updateReportStatus('${r._id}','Approved')">Approve</button>
                <button onclick="updateReportStatus('${r._id}','Rejected')">Reject</button>
              ` : ''}
            </div>
          </div>`
          )
          .join("")
      : "<p>No reports available.</p>";
  } catch (err) {
    console.error("Error loading reports:", err.message);
    if (reportsContainer) {
      reportsContainer.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  }
}

/************************************************************
 * UPDATE REPORT STATUS
 ************************************************************/
window.updateReportStatus = async function(reportId, status) {
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
    if (!res.ok) throw new Error(data.message);

    showAlert(`✅ Report ${status}`);
    loadReports();
    loadOverview();
  } catch (err) {
    showAlert("Error updating report: " + err.message);
  }
};

/************************************************************
 * LOAD NOTIFICATIONS
 ************************************************************/
async function loadNotifications() {
  const notificationsList = document.getElementById("notificationsList");
  if (!notificationsList) return;

  try {
    const res = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    let notes = await res.json();
    
    // Handle wrapped response
    if (notes.data && Array.isArray(notes.data)) {
      notes = notes.data;
    }

    if (!res.ok) throw new Error("Failed to load notifications");

    notificationsList.innerHTML = notes.length
      ? notes
          .map(
            (n) => `
          <div class="notification ${n.read ? "read" : "unread"}">
            <p>${n.message}</p>
            <small>${formatDate(n.date)}</small>
          </div>`
          )
          .join("")
      : "<p>No notifications.</p>";
  } catch (err) {
    console.error("Notification load error:", err.message);
    if (notificationsList) {
      notificationsList.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  }
}

/************************************************************
 * CHART.JS - REPORT STATUS DISTRIBUTION
 ************************************************************/
function renderChart(reportStats) {
  const ctx = document.getElementById("reportsChart");
  if (!ctx) return;

  const labels = ["Pending", "Approved", "Rejected"];
  const values = [
    reportStats.Pending || 0,
    reportStats.Approved || 0,
    reportStats.Rejected || 0,
  ];

  if (ctx._chartInstance) {
    ctx._chartInstance.destroy();
  }

  ctx._chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          label: "Reports",
          data: values,
          backgroundColor: ["#FFDEDE", "#FF0B55", "#CF0F47"],
        },
      ],
    },
  });
}

/************************************************************
 * LOGOUT
 ************************************************************/
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "/login.html";
});

console.log("✅ Superadmin.js loaded with API_URL:", API_URL);