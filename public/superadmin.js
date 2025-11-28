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
        superadmin: {
            bg: "#007bff",  // Primary blue
            text: "#fff"
        },
        admin: {
            bg: "#6c757d",  // Gray
            text: "#fff"
        },
        user: {
            bg: "#e9ecef",  // Light gray
            text: "#212529" // Dark gray
        }
    };

    const roleConfig = colors[role] || { bg: "#6c757d", text: "#fff" };
    
    return `
    <span style="
        background: ${roleConfig.bg};
        color: ${roleConfig.text};
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 0.8rem;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        ${role === 'superadmin' ? 'Super Admin' : role}
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
          <tr data-user-id="${u._id}">
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td>${getRoleBadge(u.role)}</td>
            <td>
              ${u.role !== "superadmin"
                ? `
                  <button class="delete-user-btn" data-id="${u._id}" style="background-color: #dc3545; color: white;">Delete User</button>
                `
                : "—"}</td>
          </tr>`
            ).join("")
            : `<tr><td colspan="4" style="text-align:center;">No users found.</td></tr>`;

        document.querySelectorAll(".delete-user-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                    deleteUser(btn.dataset.id);
                }
            });
        });

    } catch (err) {
        table.innerHTML = `<tr><td colspan="4" style="color:red;">Error: ${err.message}</td></tr>`;
        showAlert(err.message);
    }
}

async function deleteUser(userId) {
    try {
        const res = await fetch(`${API_URL}/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const error = await handleResponseError(res);
            throw error;
        }

        const userRow = document.querySelector(`tr[data-user-id="${userId}"]`);
        if (userRow) {
            userRow.style.opacity = '0.5';
            userRow.style.transition = 'opacity 0.3s';
            setTimeout(() => userRow.remove(), 300);
        }

        showToast('User deleted successfully', 'success');
        
        setTimeout(() => loadAllUsers(), 500);
    } catch (err) {
        console.error('Error deleting user:', err);
        showToast(`Error: ${err.message}`, 'error');
    }
}

/****************************************
 * REPORTS (MODIFIED)
 ****************************************/
// Store the current reports for modal access
let currentReports = [];

// Modal functionality
const modal = document.getElementById('reportModal');
const closeModal = document.querySelector('.close-modal');
const modalTitle = document.getElementById('modalReportTitle');
const modalStatus = document.getElementById('modalReportStatus');
const modalCategory = document.getElementById('modalReportCategory');
const modalAuthor = document.getElementById('modalReportAuthor');
const modalDate = document.getElementById('modalReportDate');
const modalDescription = document.getElementById('modalReportDescription');
const modalAttachment = document.getElementById('modalReportAttachment');
const btnApprove = document.getElementById('btnApprove');
const btnReject = document.getElementById('btnReject');
const btnClose = document.getElementById('btnClose');

// Close modal when clicking the X or outside the modal
closeModal?.addEventListener('click', () => modal.style.display = 'none');
btnClose?.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// Handle approve/reject actions
btnApprove?.addEventListener('click', () => {
    const reportId = modal.getAttribute('data-report-id');
    if (reportId) {
        updateReportStatus(reportId, 'Approved');
        modal.style.display = 'none';
    }
});

btnReject?.addEventListener('click', () => {
    const reportId = modal.getAttribute('data-report-id');
    if (reportId) {
        updateReportStatus(reportId, 'Rejected');
        modal.style.display = 'none';
    }
});

// Function to show report details in modal
function showReportDetails(report) {
    modalTitle.textContent = report.title || 'No Title';
    modalStatus.textContent = report.status || 'N/A';
    modalStatus.className = `status-${report.status?.toLowerCase() || ''}`;
    modalCategory.textContent = report.category || 'N/A';
    modalAuthor.textContent = report.user?.name || 'Unknown';
    modalDate.textContent = new Date(report.dateSubmitted || report.date || new Date()).toLocaleString();
    modalDescription.textContent = report.description || 'No description provided.';
    
    // Handle attachment if available
    if (report.attachmentPath) {
        const fileName = report.attachmentName || 'Download Attachment';
        modalAttachment.innerHTML = `
            <h3>Attachment:</h3>
            <a href="${report.attachmentPath}" target="_blank" class="attachment-link">
                ${fileName}
            </a>
        `;
    } else {
        modalAttachment.innerHTML = '';
    }
    
    // Set the report ID for approve/reject actions
    modal.setAttribute('data-report-id', report._id);
    
    // Show/hide action buttons based on status
    const actions = document.querySelector('.modal-actions');
    if (actions) {
        actions.style.display = report.status === 'Pending' ? 'flex' : 'none';
    }
    
    // Show the modal
    modal.style.display = 'block';
}

async function loadReports() {
    const container = document.getElementById("reportsContainer");
    if (!container) return;
    container.innerHTML = `<p>Loading...</p>`;

    try {
        // CORRECTED: Uses /admin/reports (Shared route)
        const res = await fetch(`${API_URL}/admin/reports`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw await handleResponseError(res);
        let reports = await res.json();
        if (reports.data) reports = reports.data;
        
        // Store reports for modal access
        currentReports = reports;

        // ----------------------------------------------------
        // NEW: Sorting Logic Implementation
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

        if (reports.length === 0) {
            container.innerHTML = "<p>No reports available.</p>";
            return;
        }

        const reportsHTML = reports.map((r, index) => {
            const isUrgent = r.urgency === 'Urgent' || r.priority === 'High';
            const cardClasses = [];
            if (r.isUnique) cardClasses.push('unique-report');
            if (isUrgent) cardClasses.push('urgent-report');
            
            return `
          <div class="report-card ${cardClasses.join(' ')}" data-report-id="${r._id}">
            ${isUrgent ? '<span class="urgent-badge">⚠️ URGENT</span>' : ''}
            ${r.isUnique ? '<span class="unique-badge">★ UNIQUE</span>' : ''}
            <div class="report-header">
              <h3>${r.title || 'No Title'}</h3>
              <span class="report-id">#${r.reportId || `REP-${String(index + 1).padStart(4, '0')}`}</span>
            </div>
            <p>${r.description ? (r.description.length > 150 ? r.description.substring(0, 150) + '...' : r.description) : 'No description'}</p>
            <div class="report-meta">
              <p><strong>Category:</strong> ${r.category || 'N/A'}</p>
              <p class="status-${(r.status || '').toLowerCase()}"><strong>Status:</strong> ${r.status || 'Unknown'}</p>
              <p><small>Submitted by: ${r.user?.name || "Unknown"}</small></p>
              <p><small>Date: ${r.dateSubmitted || r.date ? new Date(r.dateSubmitted || r.date).toLocaleString() : 'N/A'}</small></p>
            </div>
            ${r.status === "Pending" ? `
              <div class="action-buttons">
                <button class="btn-approve" onclick="event.stopPropagation(); updateReportStatus('${r._id}','Approved')">✓ Approve</button>
                <button class="btn-reject" onclick="event.stopPropagation(); updateReportStatus('${r._id}','Rejected')">✗ Reject</button>
              </div>
            ` : ""}
          </div>`;
        }).join("");

        container.innerHTML = reportsHTML;
            
        // Add click event listeners to all report cards
        document.querySelectorAll('.report-card').forEach((card, index) => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons or links inside the card
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') {
                    return;
                }
                showReportDetails(reports[index]);
            });
        });

    } catch (err) {
        container.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
        showAlert(err.message);
    }
}

async function updateReportStatus(reportId, status) {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this report?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/reports/${reportId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        const responseData = await response.json().catch(() => ({}));
        
        if (!response.ok) {
            console.error('Error details:', {
                status: response.status,
                statusText: response.statusText,
                response: responseData,
                url: response.url
            });
            throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
        }

        showAlert(`Report ${status.toLowerCase()}ed successfully!`);
        loadReports(); // Refresh the reports list
    } catch (err) {
        console.error('Error updating report status:', {
            error: err,
            reportId,
            status,
            timestamp: new Date().toISOString()
        });
        showAlert(`Failed to update report: ${err.message || 'Unknown error occurred'}`);
    }
}

/****************************************
 * NOTIFICATIONS - ENHANCED
 ****************************************/
// Use window.socket to prevent duplicate declarations
if (!window.socket) {
    window.socket = null;
}

// Initialize WebSocket connection
function initWebSocket() {
    // If socket exists and is connected, don't reinitialize
    if (window.socket?.connected) {
        console.log('WebSocket already connected');
        return;
    }
    
    try {
        // Close existing connection if any
        if (window.socket) {
            window.socket.disconnect();
        }
        
        window.socket = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        window.socket.on('connect', () => {
            console.log('WebSocket connected successfully');
            // Update UI to show connection status if needed
            const statusIndicator = document.getElementById('ws-status');
            if (statusIndicator) {
                statusIndicator.textContent = 'Connected';
                statusIndicator.style.color = 'green';
            }
        });

        window.socket.on('reportUpdated', (data) => {
            console.log('Report updated:', data);
            // Refresh notifications and reports when a report is updated
            loadNotifications();
            loadReports();
            
            // Show a toast notification for new reports
            if (data.type === 'new_report') {
                showToast(`New ${data.category} report: ${data.message}`, 'info');
            }
        });

        window.socket.on('connect_error', (err) => {
            console.error('WebSocket connection error:', err.message);
            // Update UI to show connection error
            const statusIndicator = document.getElementById('ws-status');
            if (statusIndicator) {
                statusIndicator.textContent = 'Disconnected';
                statusIndicator.style.color = 'red';
            }
            
            // Try to reconnect after a delay
            setTimeout(() => {
                console.log('Attempting to reconnect WebSocket...');
                initWebSocket();
            }, 3000);
        });
        
        window.socket.on('disconnect', (reason) => {
            console.log(`WebSocket disconnected: ${reason}`);
            if (reason === 'io server disconnect') {
                // The server has forcefully disconnected the socket
                window.socket.connect();
            }
        });
        
    } catch (err) {
        console.error('Failed to initialize WebSocket:', err);
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }, 100);
}

// Load and display notifications
async function loadNotifications() {
    const box = document.getElementById("notificationsList");
    const badge = document.querySelector('.notification-badge');
    if (!box) return;
    
    try {
        const res = await fetch(`${API_URL}/notifications`, { 
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to load notifications');
        }

        const data = await res.json();
        const notifications = Array.isArray(data) ? data : (data.data || []);
        const unreadCount = notifications.filter(n => !n.read).length;

        // Update notification badge
        if (badge) {
            badge.textContent = unreadCount > 0 ? unreadCount : '';
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }

        // Render notifications
        box.innerHTML = notifications.length > 0
            ? notifications.map((n, index) => {
                // Use the notification's _id if available, otherwise create a temporary ID
                const notificationId = n._id || `temp-${Date.now()}-${index}`;
                const isRead = n.read || false;
                
                return `
                <div class="notification ${isRead ? '' : 'unread'}" data-id="${notificationId}">
                    <p>${n.message || 'No message content'}</p>
                    <small>${formatDate(n.createdAt || new Date())}</small>
                    ${!isRead ? `<button class="mark-read" onclick="markAsRead('${notificationId}')">Mark as read</button>` : ''}
                </div>`;
            }).join('')
            : '<p>No notifications found.</p>';

    } catch (err) {
        console.error('Error loading notifications:', err);
        box.innerHTML = `<p class="error">Error: ${err.message || 'Failed to load notifications'}</p>`;
    }
}

// Mark notification as read
window.markAsRead = async (notificationId) => {
    try {
        // Skip if it's a temporary ID (starts with 'temp-')
        if (notificationId.startsWith('temp-')) {
            // Just update the UI for temporary IDs
            const notification = document.querySelector(`.notification[data-id="${notificationId}"]`);
            if (notification) {
                notification.classList.remove('unread');
                const button = notification.querySelector('.mark-read');
                if (button) button.remove();
                updateNotificationBadge();
            }
            return;
        }

        const res = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to mark notification as read');
        }

        // Update UI
        const notification = document.querySelector(`.notification[data-id="${notificationId}"]`);
        if (notification) {
            notification.classList.remove('unread');
            const button = notification.querySelector('.mark-read');
            if (button) button.remove();
            updateNotificationBadge();
        }
    } catch (err) {
        console.error('Error marking notification as read:', err);
        showToast(err.message || 'Failed to mark notification as read', 'error');
    }
};

// Helper function to update notification badge
function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    if (!badge) return;
    
    const unreadCount = document.querySelectorAll('.notification.unread').length;
    if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
};

/****************************************
 * SYSTEM NOTIFICATIONS (Superadmin View)
 ****************************************/
async function loadSystemNotifications() {
    const box = document.getElementById("systemNotificationsList"); 
    if (!box) {
        console.warn("Element with ID 'systemNotificationsList' not found.");
        return;
    }
    box.innerHTML = `<p>Loading system alerts...</p>`;

    try {
        // Use the correct endpoint for system notifications
        const res = await fetch(`${API_URL}/admin/notifications/all`, { 
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });

        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to load system notifications');
        }

        const data = await res.json();
        const notifications = Array.isArray(data) ? data : [];
        
        box.innerHTML = notifications.length > 0
            ? notifications.map(n => `
                <div class="notification system-alert">
                    <p>${n.message || 'System notification'}</p>
                    <small>${formatDate(n.date || n.createdAt || new Date())}</small>
                </div>`
            ).join('')
            : '<p>No system alerts found.</p>';

    } catch (err) {
        console.error('Error loading system notifications:', err);
        box.innerHTML = `<p class="error">Error: ${err.message || 'Failed to load system alerts'}</p>`;
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