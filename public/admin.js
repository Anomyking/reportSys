const API_URL = "https://rp-frontend.onrender.com";

// Authentication check with retry logic
function checkAuth() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  
  if (!token || (role !== "admin" && role !== "superadmin")) {
    // Give localStorage a moment to sync (especially after redirect)
    setTimeout(() => {
      const retryToken = localStorage.getItem("token");
      const retryRole = localStorage.getItem("role");
      
      if (!retryToken || (retryRole !== "admin" && retryRole !== "superadmin")) {
        window.location.href = "/login.html";
      }
    }, 100);
    return false;
  }
  return true;
}

// Helper function to sanitize HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Check authentication
if (!checkAuth()) {
  // Auth check in progress
} else {
  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', initializeDashboard);
}

function initializeDashboard() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const adminName = localStorage.getItem("name");
  const adminDept = localStorage.getItem("department");
  
  // Show/hide superadmin menu based on role
  const superadminMenu = document.getElementById("superadminMenu");
  if (superadminMenu) {
    superadminMenu.style.display = role === "superadmin" ? "block" : "none";
  }
  
  // Update department info
  const deptNameSpan = document.getElementById("admin-department-name");
  if (deptNameSpan) {
    deptNameSpan.textContent = adminDept || "Unknown";
  }
  
  // Update profile section with user data
  loadProfileData();
  
  // Setup navigation
  setupNavigation();
  
  // Setup logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.clear();
      window.location.href = "/login.html";
    });
  }
  
  // Load initial data
  loadDashboardStats();
  loadDepartmentReports();
  loadPromotionRequests();
  
  // Setup filter button
  const filterBtn = document.getElementById("filterReportsBtn");
  if (filterBtn) {
    filterBtn.addEventListener("click", loadDepartmentReports);
  }
  
  // Setup user management (superadmin only)
  if (role === "superadmin") {
    const loadUsersBtn = document.getElementById("loadAllUsersBtn");
    if (loadUsersBtn) {
      loadUsersBtn.addEventListener("click", loadAllUsers);
    }
    
    const notificationForm = document.getElementById("globalNotificationForm");
    if (notificationForm) {
      notificationForm.addEventListener("submit", sendGlobalNotification);
    }
  }
  
  // Setup profile photo upload
  const photoInput = document.getElementById("profilePhotoInput");
  if (photoInput) {
    photoInput.addEventListener("change", handleProfilePhotoUpload);
  }
  
  // Setup password change form
  const passwordForm = document.getElementById("changePasswordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", handlePasswordChange);
  }
}

// Navigation between sections
function setupNavigation() {
  const navLinks = document.querySelectorAll('.sidebar nav a[href^="#"]');
  const sections = document.querySelectorAll('main section');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all links
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Hide all sections
      sections.forEach(section => section.style.display = 'none');
      
      // Show selected section
      const targetId = link.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.style.display = 'block';
      }
    });
  });
}

// Load dashboard statistics
async function loadDashboardStats() {
  const token = localStorage.getItem("token");
  
  try {
    const res = await fetch(`${API_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to load stats');
    
    const stats = await res.json();
    
    // Update stat cards
    const usersCount = document.getElementById("stat-users-count");
    const reportsCount = document.getElementById("stat-reports-count");
    const pendingCount = document.getElementById("stat-pending-count");
    const adminsCount = document.getElementById("stat-admins-count");
    
    if (usersCount) usersCount.textContent = stats.totalUsers || 0;
    if (reportsCount) reportsCount.textContent = stats.totalReports || 0;
    if (pendingCount) pendingCount.textContent = stats.pendingReports || 0;
    if (adminsCount) adminsCount.textContent = stats.totalAdmins || 0;
    
    // Render analytics chart
    renderCompanyAnalytics(stats);
    
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}

// Load department reports
async function loadDepartmentReports() {
  const token = localStorage.getItem("token");
  const statusFilter = document.getElementById("statusFilter")?.value || '';
  
  try {
    let url = `${API_URL}/admin/reports`;
    if (statusFilter) {
      url += `?status=${statusFilter}`;
    }
    
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const reports = await res.json();
    const container = document.getElementById("reportsContainer");
    
    if (!container) return;
    
    if (!reports.length) {
      container.innerHTML = "<p>No reports found for your department.</p>";
      return;
    }
    
    container.innerHTML = reports.map(r => `
      <div class="report-card">
        <h3>${escapeHtml(r.title)}</h3>
        <p>${escapeHtml(r.description)}</p>
        <p><strong>Status:</strong> <span class="status-${r.status.toLowerCase()}">${escapeHtml(r.status)}</span></p>
        <p><strong>Submitted by:</strong> ${escapeHtml(r.submittedBy?.name || 'Unknown')}</p>
        <p><strong>Date:</strong> ${new Date(r.createdAt).toLocaleDateString()}</p>
        ${r.status === 'Pending' ? `
          <div class="actions">
            <button class="action approve" onclick="updateReportStatus('${r._id}', 'Approved')">✓ Approve</button>
            <button class="action reject" onclick="updateReportStatus('${r._id}', 'Rejected')">✗ Reject</button>
          </div>
        ` : ''}
      </div>
    `).join("");
    
  } catch (err) {
    console.error("Error loading reports:", err);
    const container = document.getElementById("reportsContainer");
    if (container) {
      container.innerHTML = `<p class="error">Error loading reports: ${escapeHtml(err.message)}</p>`;
    }
  }
}

// Update report status
async function updateReportStatus(id, status) {
  const token = localStorage.getItem("token");
  
  try {
    const res = await fetch(`${API_URL}/admin/reports/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.message || "Failed to update report");
    }
    
    alert(`Report ${status} successfully!`);
    loadDepartmentReports();
    loadDashboardStats(); // Refresh stats
    
  } catch (err) {
    alert("Error: " + err.message);
    console.error("Error updating report:", err);
  }
}

// Load promotion requests
async function loadPromotionRequests() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  
  if (role !== "superadmin") return;
  
  try {
    const res = await fetch(`${API_URL}/admin/promotion-requests`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to load requests');
    
    const requests = await res.json();
    const container = document.getElementById("requestsContainer");
    
    if (!container) return;
    
    if (!requests.length) {
      container.innerHTML = "<p>No pending promotion requests.</p>";
      return;
    }
    
    container.innerHTML = requests.map(req => `
      <div class="request-card">
        <h4>${escapeHtml(req.name)}</h4>
        <p><strong>Email:</strong> ${escapeHtml(req.email)}</p>
        <p><strong>Department:</strong> ${escapeHtml(req.department)}</p>
        <p><strong>Requested:</strong> ${new Date(req.requestedAt).toLocaleDateString()}</p>
        <div class="actions">
          <button class="action approve" onclick="handlePromotionRequest('${req._id}', 'approved')">✓ Approve</button>
          <button class="action reject" onclick="handlePromotionRequest('${req._id}', 'rejected')">✗ Reject</button>
        </div>
      </div>
    `).join("");
    
  } catch (err) {
    console.error("Error loading promotion requests:", err);
  }
}

// Handle promotion request
async function handlePromotionRequest(requestId, action) {
  const token = localStorage.getItem("token");
  
  try {
    const res = await fetch(`${API_URL}/admin/promotion-requests/${requestId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ action })
    });
    
    if (!res.ok) throw new Error('Failed to process request');
    
    alert(`Request ${action} successfully!`);
    loadPromotionRequests();
    loadDashboardStats();
    
  } catch (err) {
    alert("Error: " + err.message);
    console.error(err);
  }
}

// Load all users (superadmin only)
async function loadAllUsers() {
  const token = localStorage.getItem("token");
  
  try {
    const res = await fetch(`${API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to load users');
    
    const users = await res.json();
    const container = document.getElementById("usersListContainer");
    
    if (!container) return;
    
    container.innerHTML = users.map(user => `
      <div class="user-card">
        <h4>${escapeHtml(user.name)}</h4>
        <p>${escapeHtml(user.email)}</p>
        <p><strong>Role:</strong> ${escapeHtml(user.role)}</p>
        <p><strong>Department:</strong> ${escapeHtml(user.department)}</p>
        <button class="action" onclick="deleteUser('${user._id}')">Delete User</button>
      </div>
    `).join("");
    
  } catch (err) {
    console.error("Error loading users:", err);
  }
}

// Delete user (superadmin only)
async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  
  const token = localStorage.getItem("token");
  
  try {
    const res = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to delete user');
    
    alert('User deleted successfully!');
    loadAllUsers();
    
  } catch (err) {
    alert("Error: " + err.message);
    console.error(err);
  }
}

// Send global notification
async function sendGlobalNotification(e) {
  e.preventDefault();
  
  const token = localStorage.getItem("token");
  const message = document.getElementById("notificationMessage").value;
  const target = document.getElementById("notificationTarget").value;
  
  try {
    const res = await fetch(`${API_URL}/admin/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ message, target })
    });
    
    if (!res.ok) throw new Error('Failed to send notification');
    
    alert('Notification sent successfully!');
    document.getElementById("notificationMessage").value = '';
    
  } catch (err) {
    alert("Error: " + err.message);
    console.error(err);
  }
}

// Load profile data
async function loadProfileData() {
  const token = localStorage.getItem("token");
  
  try {
    const res = await fetch(`${API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) throw new Error('Failed to load profile');
    
    const profile = await res.json();
    
    // Update profile fields
    const nameField = document.getElementById("profileName");
    const emailField = document.getElementById("profileEmail");
    const roleField = document.getElementById("profileRole");
    const deptField = document.getElementById("profileDepartment");
    const photoImg = document.getElementById("profilePhotoImg");
    
    if (nameField) nameField.value = profile.name || '';
    if (emailField) emailField.value = profile.email || '';
    if (roleField) roleField.value = profile.role || '';
    if (deptField) deptField.value = profile.department || '';
    if (photoImg && profile.photo) photoImg.src = profile.photo;
    
  } catch (err) {
    console.error("Error loading profile:", err);
  }
}

// Handle profile photo upload
async function handleProfilePhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append('photo', file);
  
  try {
    const res = await fetch(`${API_URL}/profile/photo`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    
    if (!res.ok) throw new Error('Failed to upload photo');
    
    const data = await res.json();
    
    const photoImg = document.getElementById("profilePhotoImg");
    if (photoImg) photoImg.src = data.photoUrl;
    
    alert('Photo updated successfully!');
    
  } catch (err) {
    alert("Error: " + err.message);
    console.error(err);
  }
}

// Handle password change
async function handlePasswordChange(e) {
  e.preventDefault();
  
  const token = localStorage.getItem("token");
  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmNewPassword").value;
  
  if (newPassword !== confirmPassword) {
    alert("New passwords don't match!");
    return;
  }
  
  try {
    const res = await fetch(`${API_URL}/profile/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    if (!res.ok) throw new Error('Failed to change password');
    
    alert('Password changed successfully!');
    e.target.reset();
    
  } catch (err) {
    alert("Error: " + err.message);
    console.error(err);
  }
}

// Render company analytics chart
function renderCompanyAnalytics(stats) {
  const ctx = document.getElementById("companyAnalyticsChart");
  
  if (!ctx) return;
  
  if (typeof Chart === 'undefined') {
    console.error("Chart.js library not loaded");
    return;
  }
  
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Total Users", "Total Reports", "Pending", "Approved", "Rejected"],
      datasets: [{
        label: "Company Stats",
        data: [
          stats.totalUsers || 0,
          stats.totalReports || 0,
          stats.pendingReports || 0,
          stats.approvedReports || 0,
          stats.rejectedReports || 0
        ],
        backgroundColor: ["#4CAF50", "#2196F3", "#FFC107", "#8BC34A", "#F44336"]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Make functions globally accessible for onclick handlers
window.updateReportStatus = updateReportStatus;
window.handlePromotionRequest = handlePromotionRequest;
window.deleteUser = deleteUser;