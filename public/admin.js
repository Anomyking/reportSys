/****************************************
 * ADMIN DASHBOARD
 ****************************************/
const API_URL = window.CONFIG?.API_URL || "https://reportsys.onrender.com/api";
const token = localStorage.getItem("token");
const userRole = localStorage.getItem("role");

// Redirect if not admin
if (!token || userRole !== "admin") {
    localStorage.clear();
    window.location.href = "/login.html";
}

function showAlert(msg) {
    console.error("Admin Dashboard:", msg);
    // You can implement a toast notification here if needed
}

const formatDate = (date) => new Date(date).toLocaleString();

/****************************************
 * INIT
 ****************************************/
document.addEventListener("DOMContentLoaded", () => {
    loadOverview();
    loadReports();
    loadNotifications();
    initWebSocket();
});

// Set up event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = e.target.getAttribute('data-section');
            showSection(sectionId);
        });
    });

    // Report filter
    if (document.getElementById('applyFilterBtn')) {
        document.getElementById('applyFilterBtn').addEventListener('click', loadReports);
    }

    // Mark all as read
    if (document.getElementById('markAllReadBtn')) {
        document.getElementById('markAllReadBtn').addEventListener('click', markAllNotificationsAsRead);
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Show the specified section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show the selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }

    // Add active class to the clicked nav link
    const activeLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Load section-specific data
    switch(sectionId) {
        case 'overview':
            loadOverview();
            break;
        case 'reports':
            loadReports();
            break;
        case 'notifications':
            loadNotifications();
            break;
    }
}

// Load overview data
async function loadOverview() {
    try {
        const res = await fetch(`${API_URL}/admin/overview`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) throw await handleResponseError(res);
        const data = await res.json();

        // Update UI elements
        document.getElementById("totalReports").textContent = data.reports || 0;
        document.getElementById("pendingReports").textContent = data.pending || 0;
        document.getElementById("approvedReports").textContent = data.approved || 0;

        // Render chart if data available
        if (data.reportStats) {
            renderChart(data.reportStats);
        }

    } catch (err) {
        showAlert(err.message);
    }
}

// Load reports with optional filtering
async function loadReports() {
    const container = document.getElementById("reportsList");
    if (!container) return;
    container.innerHTML = `<p>Loading reports...</p>`;

    try {
        const status = document.getElementById("reportStatusFilter")?.value || '';
        const url = new URL(`${API_URL}/admin/reports`);
        if (status) url.searchParams.append('status', status);

        const res = await fetch(url, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) throw await handleResponseError(res);
        
        let reports = await res.json();
        if (reports.data) reports = reports.data;

        // Sort reports: pending first, then by date
        reports.sort((a, b) => {
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Render reports
        container.innerHTML = reports.length
            ? reports.map(report => `
                <div class="report-card" data-id="${report._id}">
                    <h3>${report.title || 'No title'}</h3>
                    <p>${report.description || 'No description'}</p>
                    <div class="report-meta">
                        <span class="status ${report.status.toLowerCase()}">${report.status}</span>
                        <span>${formatDate(report.createdAt)}</span>
                    </div>
                    <div class="report-actions">
                        ${report.status === 'Pending' ? `
                            <button class="btn-approve" onclick="updateReportStatus('${report._id}', 'Approved')">Approve</button>
                            <button class="btn-reject" onclick="updateReportStatus('${report._id}', 'Rejected')">Reject</button>
                        ` : ''}
                        <button class="btn-view" onclick="viewReportDetails('${report._id}')">View</button>
                    </div>
                </div>
            `).join('')
            : '<p>No reports found.</p>';

    } catch (err) {
        container.innerHTML = `<p class="error">Error: ${err.message}</p>`;
        showAlert(err.message);
    }
}

// Load notifications
async function loadNotifications() {
    const container = document.getElementById("notificationsList");
    if (!container) return;
    
    try {
        const res = await fetch(`${API_URL}/notifications`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) throw await handleResponseError(res);
        
        const data = await res.json();
        const notifications = Array.isArray(data) ? data : (data.data || []);
        
        container.innerHTML = notifications.length
            ? notifications.map(n => `
                <div class="notification ${n.read ? '' : 'unread'}" data-id="${n._id}">
                    <p>${n.message || 'No message'}</p>
                    <small>${formatDate(n.createdAt)}</small>
                    ${!n.read ? `<button onclick="markAsRead('${n._id}')">Mark as read</button>` : ''}
                </div>`
            ).join('')
            : '<p>No notifications found.</p>';

    } catch (err) {
        container.innerHTML = `<p class="error">Error: ${err.message}</p>`;
        console.error('Error loading notifications:', err);
    }
}

// Mark all notifications as read
async function markAllNotificationsAsRead() {
    try {
        const res = await fetch(`${API_URL}/notifications/read-all`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) throw await handleResponseError(res);
        
        // Update UI
        document.querySelectorAll('.notification').forEach(notification => {
            notification.classList.remove('unread');
            const button = notification.querySelector('button');
            if (button) button.remove();
        });
        
        showAlert('All notifications marked as read');
        
    } catch (err) {
        console.error('Error marking all as read:', err);
        showAlert('Failed to mark all as read');
    }
}

// Update report status
async function updateReportStatus(reportId, status) {
    if (!confirm(`Are you sure you want to ${status.toLowerCase()} this report?`)) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/admin/reports/${reportId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ status })
        });

        if (!res.ok) throw await handleResponseError(res);
        
        showAlert(`Report ${status.toLowerCase()}ed successfully!`);
        loadReports();
        loadOverview(); // Refresh stats

    } catch (err) {
        console.error('Error updating report status:', err);
        showAlert(`Failed to update report: ${err.message || 'Unknown error occurred'}`);
    }
}

// View report details
function viewReportDetails(reportId) {
    window.location.href = `report-details.html?id=${reportId}`;
}

// Mark notification as read
async function markAsRead(notificationId) {
    try {
        // Skip if it's a temporary ID (starts with 'temp-') or undefined
        if (!notificationId || notificationId.startsWith('temp-')) {
            // Just update the UI for temporary/undefined IDs
            if (notificationId) {  // Only try to update UI if we have an ID
                const notification = document.querySelector(`.notification[data-id="${notificationId}"]`);
                if (notification) {
                    notification.classList.remove('unread');
                    const button = notification.querySelector('button');
                    if (button) button.remove();
                }
            }
            return;
        }

        // Ensure we have a valid notification ID before making the API call
        if (typeof notificationId !== 'string' || notificationId.trim() === '') {
            console.error('Invalid notification ID:', notificationId);
            return;
        }

        const res = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'  // Include cookies if using session-based auth
        });

        if (!res.ok) throw await handleResponseError(res);
        
        // Update UI
        const notification = document.querySelector(`.notification[data-id="${notificationId}"]`);
        if (notification) {
            notification.classList.remove('unread');
            const button = notification.querySelector('button');
            if (button) button.remove();
        }
        
    } catch (err) {
        console.error('Error marking notification as read:', err);
        showAlert('Failed to mark notification as read');
    }
}

// Initialize WebSocket connection
function initWebSocket() {
    if (window.socket?.connected) return;

    try {
        if (window.socket) window.socket.disconnect();
        
        // Use WebSocket URL with /socket.io path and admin namespace
        const wsUrl = API_URL.replace('http', 'ws').replace('/api', '');
        window.socket = io(`${wsUrl}/admin`, {
            auth: { token },
            path: '/socket.io',
            transports: ['websocket', 'polling']
        });

        window.socket.on('connect', () => {
            console.log('WebSocket connected to admin namespace');
        });

        window.socket.on('reportUpdated', (data) => {
            loadNotifications();
            loadReports();
            showToast(`New update: ${data.message || 'Report updated'}`, 'info');
        });

        window.socket.on('connect_error', (err) => {
            console.error('WebSocket error:', err.message);
            // Only try to reconnect if we're not already reconnecting
            if (!window.reconnecting) {
                window.reconnecting = true;
                setTimeout(() => {
                    window.reconnecting = false;
                    initWebSocket();
                }, 5000);
            }
        });

    } catch (err) {
        console.error('WebSocket init failed:', err);
    }
}

// Render chart
function renderChart(stats) {
    const ctx = document.getElementById("reportsChart");
    if (!ctx) return;

    const data = [
        stats.Pending || 0, 
        stats.Approved || 0, 
        stats.Rejected || 0
    ];
    
    if (ctx._chartInstance) ctx._chartInstance.destroy();

    ctx._chartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Pending", "Approved", "Rejected"],
            datasets: [{ 
                data, 
                backgroundColor: ["#FFDEDE", "#4CAF50", "#F44336"],
                borderWidth: 1
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
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
        }, 3000);
    }, 100);
}

// Handle response errors
async function handleResponseError(res) {
    if (res.status === 401) {
        localStorage.clear();
        window.location.href = '/login.html';
        return new Error('Session expired. Please login again.');
    }

    try {
        const data = await res.json();
        return new Error(data.message || `Request failed (${res.status})`);
    } catch {
        return new Error(`Request failed (${res.status})`);
    }
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // Add to the top of the content area
    const content = document.querySelector('.content');
    if (content) {
        content.insertBefore(errorDiv, content.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    }
    
    // Also log to console
    console.error('Error:', message);
}

// Handle logout
function handleLogout() {
    if (window.socket) {
        window.socket.disconnect();
    }
    localStorage.clear();
    window.location.href = '/login.html';
}

// Make functions available globally
window.updateReportStatus = updateReportStatus;
window.viewReportDetails = viewReportDetails;
window.markAsRead = markAsRead;
