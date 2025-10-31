const API_URL = "https://rp-frontend.onrender.com";
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const adminName = localStorage.getItem("name");

if (!token || role !== "admin") {
  window.location.href = "/login.html";
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

// Load department reports
async function loadDepartmentReports() {
  try {
    const res = await fetch(`${API_URL}/admin/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    });
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
          <h3>${r.title}</h3>
          <p>${r.description}</p>
          <p><strong>Status:</strong> ${r.status}</p>
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
    if (!res.ok) throw new Error(data.message);
    alert(`Report ${status} successfully!`);
    loadDepartmentReports();
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// Notifications
async function loadNotifications() {
  const list = document.getElementById("notificationList");
  try {
    const res = await fetch(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const notes = await res.json();
    list.innerHTML = notes.length
      ? notes.map(n => `<p>${n.message}</p>`).join("")
      : "<p>No notifications yet.</p>";
  } catch (err) {
    console.error("Error loading notifications:", err.message);
  }
}

// Chart
function renderChart(reports) {
  const ctx = document.getElementById("reportChart");
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
    }
  });
}

loadDepartmentReports();
loadNotifications();
