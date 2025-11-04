/*******************************
 * SUPERADMIN DASHBOARD
 *******************************/
const API_URL = window.CONFIG.API_URL;
const token = localStorage.getItem("token");
const userRole = localStorage.getItem("role");

// Redirect if no token or wrong role
if (!token || userRole !== "superadmin") {
  localStorage.clear();
  window.location.href = "/login.html";
}

function showAlert(msg) {
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

/*******************************
 * LOAD OVERVIEW
 *******************************/
async function loadOverview() {
  try {
    const res = await fetch(`${API_URL}/superadmin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    document.getElementById("totalUsers").textContent = data.users || 0;
    document.getElementById("totalAdmins").textContent = data.admins || 0;
    document.getElementById("totalReports").textContent = data.reports || 0;

    renderChart(data.reportStats);
  } catch (err) {
    showAlert("Error loading overview: " + err.message);
  }
}

/*******************************
 * LOAD ALL USERS
 *******************************/
async function loadAllUsers() {
  const usersTable = document.getElementById("usersTable");
  if (!usersTable) return;

  try {
    const res = await fetch(`${API_URL}/superadmin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error((await res.json()).message);

    const users = await res.json();

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
                : `—`
            }
          </td>
        </tr>`
      )
      .join("");

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
    usersTable.innerHTML = `<tr><td colspan="4" style="color:red;">${err.message}</td></tr>`;
  }
}

/*******************************
 * UPDATE USER ROLE
 *******************************/
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

    showAlert(`Role updated to ${newRole}`);
    loadAllUsers();
  } catch (err) {
    showAlert(err.message);
  }
}

/*******************************
 * LOAD REPORTS
 *******************************/
async function loadReports() {
  const reportsContainer = document.getElementById("reportsContainer");
  if (!reportsContainer) return;

  try {
    const res = await fetch(`${API_URL}/superadmin/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error((await res.json()).message);

    let reports = await res.json();
    if (reports.data) reports = reports.data;

    reportsContainer.innerHTML = reports.length
      ? reports
          .map(
            (r) => `
        <div class="report-card">
          <h3>${r.title}</h3>
          <p>${r.description}</p>
          <p><strong>Category:</strong> ${r.category}</p>
          <p><strong>Status:</strong> ${r.status}</p>
          <p><small>By: ${r.user?.name || "Unknown"}</small></p>
          ${
            r.status === "Pending"
              ? `
            <button onclick="updateReportStatus('${r._id}','Approved')">Approve</button>
            <button onclick="updateReportStatus('${r._id}','Rejected')">Reject</button>
          `
              : ""
          }
        </div>`
          )
          .join("")
      : "<p>No reports available.</p>";
  } catch (err) {
    reportsContainer.innerHTML = `<p style="color:red;">${err.message}</p>`;
  }
}

/*******************************
 * UPDATE REPORT STATUS
 *******************************/
window.updateReportStatus = async function (reportId, status) {
  try {
    const res = await fetch(`${API_URL}/superadmin/reports/${reportId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) throw new Error((await res.json()).message);

    showAlert(`Report ${status}`);
    loadReports();
    loadOverview();
  } catch (err) {
    showAlert(err.message);
  }
};

/*******************************
 * LOAD NOTIFICATIONS
 *******************************/
async function loadNotifications() {
  const notificationsList = document.getElementById("notificationsList");
  if (!notificationsList) return;

  try {
    const res = await fetch(`${API_URL}/superadmin/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error((await res.json()).message);

    let notes = await res.json();
    if (notes.data) notes = notes.data;

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
    notificationsList.innerHTML = `<p style="color:red;">${err.message}</p>`;
  }
}

/*******************************
 * CHART.JS
 *******************************/
function renderChart(stats) {
  const ctx = document.getElementById("reportsChart");
  if (!ctx) return;

  const data = [
    stats.Pending || 0,
    stats.Approved || 0,
    stats.Rejected || 0,
  ];

  if (ctx._chartInstance) ctx._chartInstance.destroy();

  ctx._chartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Pending", "Approved", "Rejected"],
      datasets: [{ data, backgroundColor: ["#FFDEDE", "#FF0B55", "#CF0F47"] }],
    },
  });
}

/*******************************
 * LOGOUT
 *******************************/
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "/login.html";
});

console.log("Superadmin.js loaded:", API_URL);
