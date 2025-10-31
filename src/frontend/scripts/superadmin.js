/************************************************************
 * CONFIG
 ************************************************************/
const API_URL = "https://rp-frontend.onrender.com";
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

async function loadOverview() {
  try {
    const res = await fetch(`${API_URL}/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.message);

    document.getElementById("totalUsers").textContent = data.users;
    document.getElementById("totalAdmins").textContent = data.admins;
    document.getElementById("totalReports").textContent = data.reports;

    renderChart(data.reportStats);
  } catch (err) {
    console.error("Overview load error:", err.message);
  }
}

async function loadAllUsers() {
  const usersTable = document.getElementById("usersTable");
  if (!usersTable) return;

  try {
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
  }
}

async function updateUserRole(userId, newRole) {
  try {
    const res = await fetch(`${API_URL}/admin/role/${userId}`, {
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

async function loadReports() {
  const reportsContainer = document.getElementById("reportsContainer");
  if (!reportsContainer) return;

  try {
    const res = await fetch(`${API_URL}/admin/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const reports = await res.json();

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
              <button onclick="updateReportStatus('${r._id}','Approved')">Approve</button>
              <button onclick="updateReportStatus('${r._id}','Rejected')">Reject</button>
            </div>
          </div>`
          )
          .join("")
      : "<p>No reports available.</p>";
  } catch (err) {
    console.error("Error loading reports:", err.message);
  }
}

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
    if (!res.ok) throw new Error(data.message);

    showAlert(`✅ Report ${status}`);
    loadReports();
    loadOverview();
  } catch (err) {
    showAlert("Error updating report: " + err.message);
  }
}

async function loadNotifications() {
  const notificationsDiv = document.getElementById("notifications");
  if (!notificationsDiv) return;

  try {
    const res = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const notes = await res.json();

    notificationsDiv.innerHTML = notes.length
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

  new Chart(ctx, {
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

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "/login.html";
});
