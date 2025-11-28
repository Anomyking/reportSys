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
    if (!container) {
        console.error('Reports container not found');
        return;
    }
    container.innerHTML = '<tr><td colspan="4" class="center">Loading reports...</td></tr>';

    try {
        const status = document.getElementById("reportStatusFilter")?.value || '';
        const url = new URL(`${API_URL}/admin/reports`);
        if (status) url.searchParams.append('status', status);

        console.log('Fetching reports from:', url.toString());

        const res = await fetch(url, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            credentials: 'include'
        });

        console.log('Response status:', res.status);

        if (!res.ok) {
            const error = await handleResponseError(res);
            console.error('API Error:', error);
            container.innerHTML = `<tr><td colspan="4" class="error">Error loading reports: ${error.message}</td></tr>`;
            return;
        }
        
        let { data: reports = [] } = await res.json();
        console.log('Received reports data:', reports);

        // Sort reports: pending first, then by date
        reports.sort((a, b) => {
            if (a.status === 'Pending' && b.status !== 'Pending') return -1;
            if (a.status !== 'Pending' && b.status === 'Pending') return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // Render reports with enhanced styling and unique indicators
        container.innerHTML = reports.length > 0
            ? reports.map((report, index) => {
                const isUnique = report.isUnique || false;
                const reportId = report.reportId || `REP-${String(index + 1).padStart(4, '0')}`;
                const statusClass = report.status.toLowerCase();
                
                return `
                <tr data-id="${report._id}" class="${isUnique ? 'unique-report' : ''}">
                    <td>
                        <div class="report-header">
                            <h3>
                                ${report.title || 'No title'}
                                ${isUnique ? '<span class="unique-badge">★ UNIQUE</span>' : ''}
                            </h3>
                            <span class="report-id">${reportId}</span>
                        </div>
                        <div class="report-meta">
                            <p><strong>Category:</strong> ${report.category || 'N/A'}</p>
                            <p><strong>Submitted by:</strong> ${report.user?.name || 'System'}</p>
                            <p class="status-${statusClass}"><strong>Status:</strong> ${report.status}</p>
                            <p><small>${formatDate(report.createdAt)}</small></p>
                        </div>
                        <div class="action-buttons">
                            ${report.status === 'Pending' ? `
                                <button class="btn-approve" onclick="updateReportStatus('${report._id}', 'Approved')">✓ Approve</button>
                                <button class="btn-reject" onclick="updateReportStatus('${report._id}', 'Rejected')">✗ Reject</button>
                            ` : ''}
                            <button class="btn-view" onclick="viewReportDetails('${report._id}')">View Details</button>
                            <button class="btn-delete" onclick="deleteReport('${report._id}')" style="background-color: #dc3545; color: white;">Delete</button>
                        </div>
                    </td>
                </tr>`;
            }).join('')
            : '<tr><td colspan="4" class="center">No reports found.</td></tr>';

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
        
        // First render the notifications with proper IDs
        container.innerHTML = notifications.length
            ? notifications.map(n => {
                // Ensure we have a valid ID, or generate a temporary one if missing
                const notificationId = n._id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                return `
                <div class="notification ${n.read ? '' : 'unread'}" data-id="${notificationId}">
                    <p>${n.message || 'No message'}</p>
                    <small>${formatDate(n.createdAt)}</small>
                    ${!n.read ? `<button class="mark-as-read" data-id="${notificationId}">Mark as read</button>` : ''}
                </div>`;
            }).join('')
            : '<p>No notifications found.</p>';
            
        // Add event delegation for mark as read buttons
        container.addEventListener('click', async (e) => {
            const button = e.target.closest('.mark-as-read');
            if (button) {
                const notificationId = button.dataset.id;
                if (notificationId) {
                    await markAsRead(notificationId);
                }
            }
        });

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
            if (notificationId) {
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

        const baseUrl = API_URL.endsWith('/api') ? API_URL.slice(0, -4) : API_URL;
        const res = await fetch(`${baseUrl}/api/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            credentials: 'include'
        });

        if (!res.ok) {
            const error = await handleResponseError(res);
            console.error('Error marking notification as read:', error);
            throw error;
        }

        // Update UI
        const notification = document.querySelector(`.notification[data-id="${notificationId}"]`);
        if (notification) {
            notification.classList.remove('unread');
            const button = notification.querySelector('button');
            if (button) button.remove();
        }

        // Refresh notifications count in the UI if needed
        const unreadCount = document.querySelector('.notification-badge');
        if (unreadCount) {
            const currentCount = parseInt(unreadCount.textContent) || 0;
            if (currentCount > 0) {
                unreadCount.textContent = currentCount - 1;
                if (currentCount === 1) {
                    unreadCount.style.display = 'none';
                }
            }
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
        
        // Use WebSocket URL with the correct path
        const wsUrl = API_URL.replace('http', 'ws').replace('/api', '');
        window.socket = io(wsUrl, {
            auth: { token },
            path: '/socket.io',
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000
        });

        window.socket.on('connect', () => {
            console.log('✅ WebSocket connected');
            // Subscribe to admin-specific events
            window.socket.emit('admin:subscribe');
        });

        window.socket.on('reportUpdated', (data) => {
            console.log('📝 Report updated:', data);
            loadNotifications();
            loadReports();
            showToast(`New update: ${data.message || 'Report updated'}`, 'info');
        });

        window.socket.on('connect_error', (err) => {
            console.error('❌ WebSocket connection error:', err.message);
            showToast('Connection error. Reconnecting...', 'error');
            
            // Only try to reconnect if we're not already reconnecting
            if (!window.reconnecting) {
                window.reconnecting = true;
                setTimeout(() => {
                    console.log('🔄 Attempting to reconnect WebSocket...');
                    window.reconnecting = false;
                    initWebSocket();
                }, 5000);
            }
        });

        window.socket.on('disconnect', (reason) => {
            console.log('🔌 WebSocket disconnected:', reason);
            if (reason === 'io server disconnect') {
                // The disconnection was initiated by the server, you need to reconnect manually
                console.log('Server disconnected the socket. Reconnecting...');
                setTimeout(() => initWebSocket(), 1000);
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

// Delete report function
async function deleteReport(reportId) {
    if (!reportId) return;

    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/admin/reports/${reportId}`, {
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

        // Remove the report from the UI
        const reportElement = document.querySelector(`[data-report-id="${reportId}"]`);
        if (reportElement) {
            reportElement.remove();
        }

        showToast('Report deleted successfully', 'success');
    } catch (err) {
        console.error('Error deleting report:', err);
        showToast(`Error: ${err.message}`, 'error');
    }
}

// Make functions available globally
window.updateReportStatus = updateReportStatus;
window.viewReportDetails = viewReportDetails;
window.markAsRead = markAsRead;
window.deleteReport = deleteReport;
