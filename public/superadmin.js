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