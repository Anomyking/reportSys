/************************************************************
 * SUPERADMIN DASHBOARD (Vercel Compatible)
 ************************************************************/

const API_URL = window.CONFIG?.API_URL;
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "/login.html";
}

/* Utility Helpers */
function showAlert(msg) {
  alert(msg);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString();
}

function getRoleBadge(role) {
  const colors = {
    superadmin: "#FF0B55",
    admin: "#CF0F47",
    user: "#777"
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

/* Page Load */
document.addEventListener("DOMContentLoaded", () => {
  loadOverview();
  loadAllUsers();
  loadReports();
  loadNotifications();
});

/************************************************************
 * UPDATE USER ROLE
 ************************************************************/
async function updateUserRole(userId, newRole) {
  try {
    const res = await fetch(`${API_URL}/superadmin/users/${userId}/role`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ role: newRole })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message);
    }

    showAlert("✅ Role updated");
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
    const res = await fetch(`${API_URL}/superadmin/reports`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Failed to load reports (${res.status}): ${errorText.slice(0, 100)}...`
      );
    }

    let reports = await res.json();
    if (reports.data && Array.isArray(reports.data)) {
      reports = reports.data;
    }

    reportsContainer.innerHTML = reports.length
      ? reports
          .map(
            r => `
          <div class="report-card">
            <h3>${r.title}</h3>
            <p>${r.description}</p>
            <p><strong>Category:</strong> ${r.category}</p>
            <p><strong>Status:</strong>
              <span style="font-weight:bold; color:${
                r.status === "Pending"
                  ? "#FF0B55"
                  : r.status === "Approved"
                  ? "#2ecc71"
                  : "#CF0F47"
              }">
                ${r.status}
              </span>
            </p>
            <p><small>Submitted by: ${r.user?.name || "Unknown"}</small></p>

            <div class="report-actions">
              ${
                r.status === "Pending"
                  ? `
              <button onclick="updateReportStatus('${r._id}', 'Approved')">
                Approve
              </button>
              <button onclick="updateReportStatus('${r._id}', 'Rejected')">
                Reject
              </button>`
                  : ""
              }
            </div>
          </div>`
          )
          .join("")
      : "<p>No reports available.</p>";
  } catch (err) {
    console.error("Error loading reports:", err.message);
    reportsContainer.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
  }
}

/************************************************************
 * UPDATE REPORT STATUS
 ************************************************************/
window.updateReportStatus = async function (reportId, status) {
  try {
    const res = await fetch(`${API_URL}/superadmin/reports/${reportId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || `Status: ${res.status}`);
    }

    showAlert(`✅ Report ${status}`);
    loadReports();
    loadOverview();
  } catch (err) {
    showAlert("Error updating report: " + err.message);
  }
};
