const API_URL = "https://rp-frontend.onrender.com";

// Authentication check with retry logic
function checkAuth() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  
  if (!token || role !== "admin") {
    // Give localStorage a moment to sync (especially after redirect)
    setTimeout(() => {
      const retryToken = localStorage.getItem("token");
      const retryRole = localStorage.getItem("role");
      
      if (!retryToken || retryRole !== "admin") {
        window.location.href = "/login.html";
      }
    }, 100);
    return false;
  }
  return true;
}

if (!checkAuth()) {
  // Auth check in progress
} else {
  // Proceed with initialization
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const adminName = localStorage.getItem("name");
  
  // Set admin name
  document.getElementById("adminName").textContent = adminName || "Admin";
}

// Set admin name
document.getElementById("adminName").textContent = adminName || "Admin";

// Sidebar toggle
const hamburger = document.querySelector(".hamburger");
const sidebar = document.querySelector(".sidebar");
if (hamburger && sidebar) {
  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.clear();
  window.location.href = "/login.html";
});

// Helper function to sanitize HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load department reports
async function loadDepartmentReports() {
  try {
    const res = await fetch(`${API_URL}/admin/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const reports = await res.json();
    const container = document.getElementById("adminReports");
    
    if (!reports.length) {
      container.innerHTML = "<p>No reports found for your department.</p>";
      return;
    }
    
    container.innerHTML = reports
      .map(
        (r) => `
        <div class="report-card">
          <h3>${escapeHtml(r.title)}</h3>
          <p>${escapeHtml(r.description)}</p>
          <p><strong>Status:</strong> ${escapeHtml(r.status)}</p>
          <div class="actions">
            <button class="action" onclick="updateReportStatus('${r._id}', 'Approved')">Approve</button>
            <button class="action" onclick="updateReportStatus('${r._id}', 'Rejected')">Reject</button>
          </div>
        </div>`
      )
      .join("");
      
    renderChart(reports);
  } catch (err) {
    console.error("Error loading reports:", err.message);
    const container = document.getElementById("adminReports");
    container.innerHTML = `<p class="error">Error loading reports: ${escapeHtml(err.message)}</p>`;
  }
}

// Approve or Reject
async function updateReportStatus(id, status) {
  try {
    const res = await fetch(`${API_URL}/admin/reports/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.message || "Failed to update report");
    }
    
    alert(`Report ${status} successfully!`);
    loadDepartmentReports();
  } catch (err) {
    alert("Error: " + err.message);
    console.error("Error updating report:", err);
  }
}

// Notifications
async function loadNotifications() {
  const list = document.getElementById("notificationList");
  try {
    const res = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const notes = await res.json();
    list.innerHTML = notes.length
      ? notes.map(n => `<p>${escapeHtml(n.message)}</p>`).join("")
      : "<p>No notifications yet.</p>";
  } catch (err) {
    console.error("Error loading notifications:", err.message);
    list.innerHTML = "<p>Error loading notifications.</p>";
  }
}

// Chart
function renderChart(reports) {
  const ctx = document.getElementById("reportChart");
  
  if (!ctx) {
    console.error("Chart canvas element not found");
    return;
  }
  
  if (typeof Chart === 'undefined') {
    console.error("Chart.js library not loaded");
    return;
  }
  
  const statusCount = {
    Pending: reports.filter(r => r.status === "Pending").length,
    Approved: reports.filter(r => r.status === "Approved").length,
    Rejected: reports.filter(r => r.status === "Rejected").length,
  };
  
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(statusCount),
      datasets: [{
        label: "Reports",
        data: Object.values(statusCount),
        backgroundColor: ["#FFDEDE", "#FF0B55", "#CF0F47"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Initialize dashboard
loadDepartmentReports();
loadNotifications();