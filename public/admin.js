/************************************************************
 * ADMIN DASHBOARD - JAVASCRIPT
 * Handles admin-specific functionality
 ************************************************************/

const API_URL = "https://reportsys.onrender.com/api";
let currentUser = {};

// DOM Elements
const overviewSection = document.getElementById('overview');
const reportsSection = document.getElementById('reports');
const notificationsSection = document.getElementById('notifications');
const reportsList = document.getElementById('reportsList');
const notificationsList = document.getElementById('notificationsList');
const reportStatusFilter = document.getElementById('reportStatusFilter');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const markAllReadBtn = document.getElementById('markAllReadBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Fetch current user data
        const userRes = await fetch(`${API_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!userRes.ok) {
            throw new Error('Failed to fetch user data');
        }

        currentUser = await userRes.json();

        // Verify admin role
        if (currentUser.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return;
        }

        // Initialize dashboard
        setupEventListeners();
        loadOverview();
        loadReports();
        loadNotifications();

    } catch (error) {
        console.error('Initialization error:', error);
        window.location.href = 'login.html';
    }
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
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', loadReports);
    }

    // Mark all notifications as read
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', markAllNotificationsAsRead);
    }

    // Logout
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
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const [reportsRes, statsRes] = await Promise.all([
            fetch(`${API_URL}/admin/overview`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'  // Important for cookies if using them
            }),
            fetch(`${API_URL}/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'  // Important for cookies if using them
            })
        ]);

        if (!reportsRes.ok || !statsRes.ok) {
            throw new Error('Failed to load overview data');
        }

        const reports = await reportsRes.json();
        const stats = await statsRes.json();

        // Update UI with the fetched data
        updateOverviewUI(reports, stats);

    } catch (error) {
        console.error('Error loading overview:', error);
        showError('Failed to load overview data');
    }
}

// Load reports with optional filtering
async function loadReports() {
    try {
        const token = localStorage.getItem('token');
        const status = reportStatusFilter ? reportStatusFilter.value : '';

        const url = new URL(`${API_URL}/admin/reports`);
        if (status) {
            url.searchParams.append('status', status);
        }

        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error('Failed to load reports');
        }

        const reports = await res.json();
        renderReportsList(reports);

    } catch (error) {
        console.error('Error loading reports:', error);
        showError('Failed to load reports');
    }
}

// Load notifications
async function loadNotifications() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        const res = await fetch(`${API_URL}/admin/notifications`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            credentials: 'include'  // Important for cookies if using them
        });

        if (!res.ok) {
            throw new Error('Failed to load notifications');
        }

        const notifications = await res.json();
        renderNotifications(notifications);

    } catch (error) {
        console.error('Error loading notifications:', error);
        showError('Failed to load notifications');
    }
}

// Mark all notifications as read
async function markAllNotificationsAsRead() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/notifications/read-all`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            throw new Error('Failed to mark notifications as read');
        }

        // Reload notifications
        loadNotifications();

    } catch (error) {
        console.error('Error marking notifications as read:', error);
        showError('Failed to update notifications');
    }
}

// Update report status
async function updateReportStatus(reportId, status) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/admin/reports/${reportId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (!res.ok) {
            throw new Error('Failed to update report status');
        }

        // Reload reports
        loadReports();
        loadOverview(); // Refresh stats

    } catch (error) {
        console.error('Error updating report status:', error);
        showError('Failed to update report status');
    }
}

// Render reports list
function renderReportsList(reports) {
    if (!reportsList) return;

    if (reports.length === 0) {
        reportsList.innerHTML = '<p>No reports found.</p>';
        return;
    }

    const html = reports.map(report => `
        <div class="report-card" data-id="${report._id}">
            <h3>${report.title}</h3>
            <p>${report.description}</p>
            <div class="report-meta">
                <span class="status ${report.status.toLowerCase()}">${report.status}</span>
                <span>${new Date(report.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="report-actions">
                <button class="btn-approve" onclick="updateReportStatus('${report._id}', 'approved')">Approve</button>
                <button class="btn-reject" onclick="updateReportStatus('${report._id}', 'rejected')">Reject</button>
            </div>
        </div>
    `).join('');

    reportsList.innerHTML = html;
}

// Render notifications
function renderNotifications(notifications) {
    if (!notificationsList) return;

    if (notifications.length === 0) {
        notificationsList.innerHTML = '<p>No notifications.</p>';
        return;
    }

    const html = notifications.map(notification => `
        <div class="notification ${notification.read ? 'read' : 'unread'}" data-id="${notification._id}">
            <p>${notification.message}</p>
            <small>${new Date(notification.createdAt).toLocaleString()}</small>
        </div>
    `).join('');

    notificationsList.innerHTML = html;
}

// Update overview UI with data
function updateOverviewUI(reports, stats) {
    // Update stats
    document.getElementById('totalReports').textContent = stats.total || 0;
    document.getElementById('pendingReports').textContent = stats.pending || 0;
    document.getElementById('approvedReports').textContent = stats.approved || 0;
    document.getElementById('rejectedReports').textContent = stats.rejected || 0;

    // Render chart if needed
    renderOverviewChart(reports);
}

// Render overview chart
function renderOverviewChart(reports) {
    const ctx = document.getElementById('reportsChart');
    if (!ctx) return;

    // Group reports by status
    const statusCounts = reports.reduce((acc, report) => {
        acc[report.status] = (acc[report.status] || 0) + 1;
        return acc;
    }, {});

    // Create chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pending', 'Approved', 'Rejected'],
            datasets: [{
                label: 'Reports by Status',
                data: [
                    statusCounts['Pending'] || 0,
                    statusCounts['Approved'] || 0,
                    statusCounts['Rejected'] || 0
                ],
                backgroundColor: [
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 99, 132, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
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
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    window.location.href = 'login.html';
}

// Make updateReportStatus available globally
window.updateReportStatus = updateReportStatus;
