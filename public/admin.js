/************************************************************
 * GLOBAL CONSTANTS & CONFIG
 ************************************************************/
const API_URL = window.CONFIG.API_URL;
const token = localStorage.getItem("token");
let refreshInterval = null;

// --- Global Variables for User State ---
let currentUser = {
    role: 'user', // Default to prevent unauthorized access
    department: '',
    id: ''
};

// Global variable to hold the chart instance
let analyticsChart = null; 

// --- Helper Functions ---

/** Gets JWT from localStorage and formats the Authorization header. */
function getAuthHeader() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html'; // Redirect if no token
        return {};
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/** Shows a specific section and hides all others. */
function showSection(sectionId) {
    document.querySelectorAll('main.content section').forEach(section => {
        section.style.display = 'none';
    });
    const activeSection = document.getElementById(sectionId);
    if (activeSection) {
        activeSection.style.display = 'block';
    }
    // Update active class in sidebar
    document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
    // Ensure the element exists before trying to add a class
    const navLink = document.querySelector(`.sidebar nav a[href="#${sectionId}"]`);
    if (navLink) {
        navLink.classList.add('active');
    }
}

/** Fetches user profile to determine role and department */
async function loadUserProfile() {
    try {
        // ⭐ FIX: Using API_URL instead of API_BASE_URL
        const response = await fetch(`${API_URL}/users/profile`, { 
            method: 'GET',
            headers: getAuthHeader()
        });

        if (!response.ok) throw new Error('Failed to fetch profile.');
        
        const data = await response.json();
        currentUser.role = data.role;
        currentUser.department = data.department;
        currentUser.id = data._id;

        // 1. Enforce Admin Access
        if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
            alert('Access Denied. Redirecting to user view.');
            window.location.href = 'user-dashboard.html';
            return;
        }

        // 2. Configure UI based on Role
        const superadminMenu = document.getElementById('superadminMenu');
        const departmentInfo = document.getElementById('department-info');
        
        if (currentUser.role === 'superadmin') {
            if (superadminMenu) superadminMenu.style.display = 'block';
            if (departmentInfo) departmentInfo.style.display = 'none';
        } else { // Normal Admin
            if (superadminMenu) superadminMenu.style.display = 'none';
            if (departmentInfo) {
                departmentInfo.style.display = 'block';
                document.getElementById('admin-department-name').textContent = currentUser.department;
            }
        }

        // 3. Load Initial Data
        loadDashboardOverview();
        loadReports(); 
        loadPromotionRequests();
        if (currentUser.role === 'superadmin') {
             loadAllUsers(); 
             loadSystemNotifications();
        }

        // 4. Set default active section and profile details
        showSection('dashboardOverview');
        // Ensure elements exist before setting values
        if (document.getElementById('profileName')) document.getElementById('profileName').value = data.name;
        if (document.getElementById('profileEmail')) document.getElementById('profileEmail').value = data.email;
        if (document.getElementById('profileRole')) document.getElementById('profileRole').value = data.role.toUpperCase();
        if (document.getElementById('profileDepartment')) document.getElementById('profileDepartment').value = data.department || 'N/A';


    } catch (error) {
        console.error('Initialization error:', error);
        window.location.href = 'login.html';
    }
}

// --- CORE ADMIN DATA LOADING FUNCTIONS ---

/** Initializes or updates the Chart.js line chart with report status data. */
function initializeAnalyticsChart(reportStats) {
    const ctx = document.getElementById('companyAnalyticsChart'); 

    if (!ctx) {
        console.warn("Canvas element 'companyAnalyticsChart' not found. Skipping chart initialization.");
        return;
    }

    const labels = ['Pending', 'Approved', 'Rejected'];
    const dataCounts = [
        reportStats.Pending || 0,
        reportStats.Approved || 0,
        reportStats.Rejected || 0,
    ];

    const chartData = {
        labels: labels,
        datasets: [{
            label: 'Report Status Counts',
            data: dataCounts,
            backgroundColor: [
                'rgba(241, 196, 15, 0.7)', 
                'rgba(46, 204, 113, 0.7)', 
                'rgba(231, 76, 60, 0.7)',  
            ],
            borderColor: [
                'rgb(241, 196, 15)',
                'rgb(46, 204, 113)',
                'rgb(231, 76, 60)',
            ],
            borderWidth: 1
        }]
    };

    if (analyticsChart) {
        analyticsChart.data.datasets[0].data = dataCounts;
        analyticsChart.update();
    } else {
        // Ensure the Chart global object is available before trying to instantiate
        if (typeof Chart === 'undefined') {
            console.error("Chart.js library is not loaded. Cannot initialize chart.");
            return;
        }
        analyticsChart = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Current Report Status Breakdown' }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Reports' }
                    }
                }
            }
        });
    }
}


/** Loads top-level stats from the backend. */
async function loadDashboardOverview() {
    try {
        // ⭐ FIX: Using API_URL
        const response = await fetch(`${API_URL}/admin/overview`, { headers: getAuthHeader() });
        const data = await response.json();
        
        document.getElementById('stat-users-count').textContent = data.users.toLocaleString();
        document.getElementById('stat-reports-count').textContent = data.reports.toLocaleString();
        document.getElementById('stat-admins-count').textContent = data.admins.toLocaleString();
        document.getElementById('stat-pending-count').textContent = data.reportStats.Pending?.toLocaleString() || '0';
        
        // ⭐ NEW: Initialize the Chart.js chart with fresh data
        initializeAnalyticsChart(data.reportStats);

    } catch (error) {
        console.error('Failed to load overview data:', error);
        alert('Could not load dashboard stats.');
    }
}


/** Loads department-filtered reports (handled by the backend) */
async function loadReports() {
    const container = document.getElementById('reportsContainer');
    container.innerHTML = '<p>Fetching reports...</p>';
    
    // Get filter values
    const status = document.getElementById('statusFilter').value;
    const query = status ? `?status=${status}` : '';

    try {
        // ⭐ FIX: Using API_URL
        const response = await fetch(`${API_URL}/admin/reports${query}`, { headers: getAuthHeader() });
        if (!response.ok) throw new Error('Failed to fetch reports.');
        
        const reports = await response.json();
        
        container.innerHTML = reports.length === 0 
            ? '<p>No reports found matching criteria.</p>'
            : reports.map(report => createReportCard(report)).join('');
        
    } catch (error) {
        console.error('Failed to load reports:', error);
        container.innerHTML = '<p class="error">Error loading reports. Check console.</p>';
    }
}


/** Loads users requesting promotion. */
async function loadPromotionRequests() {
    const container = document.getElementById('requestsContainer');
    container.innerHTML = '<p>Fetching requests...</p>';

    try {
        // ⭐ FIX: Using API_URL
        const response = await fetch(`${API_URL}/admin/users/requests`, { headers: getAuthHeader() });
        const data = await response.json();

        if (data.count === 0) {
            container.innerHTML = '<p class="success-note">No pending promotion requests at this time.</p>';
            return;
        }

        container.innerHTML = data.data.map(user => createRequestCard(user)).join('');

    } catch (error) {
        console.error('Failed to load promotion requests:', error);
        container.innerHTML = '<p class="error">Error loading promotion requests.</p>';
    }
}

// --- SUPERADMIN FUNCTIONS (Stubs) ---

async function loadAllUsers() {
    const container = document.getElementById('usersContainer');
    if (currentUser.role !== 'superadmin' || !container) return;

    container.innerHTML = '<p>Fetching all users...</p>';

    try {
        // This connects to the GET /api/v1/admin/users route
        const response = await fetch(`${API_URL}/admin/users`, { headers: getAuthHeader() });
        if (!response.ok) throw new Error('Failed to fetch all users.');

        const users = await response.json();
        
        container.innerHTML = users.length === 0 
            ? '<p>No other users found.</p>'
            : users.map(user => createUserRow(user)).join(''); // Placeholder for render function

    } catch (error) {
        console.error('loadAllUsers error:', error);
        container.innerHTML = '<p class="error">Error loading user list.</p>';
    }
}

async function loadSystemNotifications() {
    const container = document.getElementById('systemNotificationsContainer');
    if (currentUser.role !== 'superadmin' || !container) return;
    
    container.innerHTML = '<p>Fetching system notifications history...</p>';

    try {
        // This connects to the GET /api/v1/admin/notifications/all route
        const response = await fetch(`${API_URL}/admin/notifications/all`, { headers: getAuthHeader() });
        if (!response.ok) throw new Error('Failed to fetch system notifications.');
        
        const notifications = await response.json();

        container.innerHTML = notifications.length === 0 
            ? '<p>No system notification history found.</p>'
            : notifications.map(n => createNotificationRow(n)).join(''); // Placeholder for render function

    } catch (error) {
        console.error('loadSystemNotifications error:', error);
        container.innerHTML = '<p class="error">Error loading notification history.</p>';
    }
}

// --- EVENT HANDLERS (Delegation) ---

/** Handles clicks on action buttons (Approve/Reject) */
async function handleActionClick(event) {
    if (event.target.classList.contains('report-action-btn')) {
        const id = event.target.dataset.id;
        const action = event.target.dataset.action; // e.g., 'Approved' or 'Rejected'
        
        try {
            // ⭐ FIX: Using API_URL
            const response = await fetch(`${API_URL}/admin/reports/${id}`, {
                method: 'PUT',
                headers: getAuthHeader(),
                body: JSON.stringify({ status: action })
            });
            
            if (!response.ok) throw new Error(`Failed to set status to ${action}`);
            
            alert(`Report ${id} successfully marked as ${action}!`);
            loadReports(); 
            loadDashboardOverview(); 
            
        } catch (error) {
            console.error('Report action error:', error);
            alert(`Error processing request: ${error.message}`);
        }
    }

    if (event.target.classList.contains('request-action-btn')) {
        const id = event.target.dataset.id;
        const action = event.target.dataset.action; // 'approve' or 'reject'
        
        try {
            // ⭐ FIX: Using API_URL
            const response = await fetch(`${API_URL}/admin/users/${id}/${action}`, {
                method: 'PATCH',
                headers: getAuthHeader()
            });

            if (!response.ok) throw new Error(`Failed to ${action} user promotion.`);

            alert(`User promotion successfully ${action}d!`);
            loadPromotionRequests(); 
            loadDashboardOverview();
        } catch (error) {
            console.error('Promotion action error:', error);
            alert(`Error processing request: ${error.message}`);
        }
    }
}

/** Handles the global notification submission (Superadmin only) */
async function handleNotificationSubmit(event) {
    event.preventDefault();
    
    if (currentUser.role !== 'superadmin') return alert('Not authorized.');

    const message = document.getElementById('notificationMessage').value;
    const target = document.getElementById('notificationTarget').value;

    try {
        // ⭐ FIX: Using API_URL
        const response = await fetch(`${API_URL}/admin/notifications`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ message, target: target }) // Correct body payload
        });
        
        if (!response.ok) throw new Error('Failed to send notification.');
        
        alert('Global notification sent successfully!');
        document.getElementById('globalNotificationForm').reset();
        loadSystemNotifications(); // Refresh the list of notifications

    } catch (error) {
        console.error('Notification error:', error);
        alert(`Error sending notification: ${error.message}`);
    }
}


// --- DOM Creation Helpers ---

function createReportCard(report) {
    const statusClass = report.status.toLowerCase();
    return `
        <div class="report-card ${statusClass}">
            <div class="report-header">
                <h3>${report.title}</h3>
                <span class="status-tag ${statusClass}">${report.status}</span>
            </div>
            <p>Category: ${report.category}</p>
            <p>Submitted by: ${report.user.name || 'N/A'}</p>
            <p>Date: ${new Date(report.createdAt).toLocaleDateString()}</p>
            <div class="report-actions">
                <button class="report-action-btn" data-id="${report._id}" data-action="Approved">Approve</button>
                <button class="report-action-btn" data-id="${report._id}" data-action="Rejected">Reject</button>
                <button class="report-action-btn details-btn" data-id="${report._id}" data-action="ViewDetails">Review/Details</button>
            </div>
        </div>
    `;
}

function createRequestCard(user) {
    return `
        <div class="request-card">
            <h4>${user.name} (${user.email})</h4>
            <p>Requested Department: ${user.department}</p>
            <div class="request-actions">
                <button class="request-action-btn approve" data-id="${user._id}" data-action="approve">✅ Approve Promotion</button>
                <button class="request-action-btn reject" data-id="${user._id}" data-action="reject">❌ Reject Request</button>
            </div>
        </div>
    `;
}

function createUserRow(user) {
    const isSuper = user.role === 'superadmin';
    return `
        <div class="user-row ${isSuper ? 'superadmin-row' : ''}">
            <span>${user.name}</span>
            <span>${user.email}</span>
            <span>${user.role}</span>
            <span>${user.department || 'N/A'}</span>
            <button class="change-role-btn" data-id="${user._id}" data-current-role="${user.role}" 
                ${isSuper && currentUser.id !== user._id ? 'disabled' : ''}>
                Change Role
            </button>
        </div>
    `;
}

function createNotificationRow(notification) {
    return `
        <div class="notification-row">
            <p>${notification.message}</p>
            <small>Target: ${notification.target} | Sent: ${new Date(notification.date).toLocaleString()}</small>
        </div>
    `;
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Profile/Role Check
    loadUserProfile();

    // 2. Navigation Listener
    document.querySelector('.sidebar nav').addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.hash) {
            e.preventDefault();
            const sectionId = e.target.hash.substring(1);
            showSection(sectionId);

            // Conditional data loading for Superadmin sections after navigation
            if (sectionId === 'userManagement' && currentUser.role === 'superadmin') {
                loadAllUsers();
            }
            if (sectionId === 'systemNotifications' && currentUser.role === 'superadmin') {
                loadSystemNotifications();
            }
        }
    });

    // 3. Delegation for Report/Promotion Actions
    document.querySelector('main.content').addEventListener('click', handleActionClick);

    // 4. Filter Button Listener
    const filterBtn = document.getElementById('filterReportsBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', loadReports);
    }


    // 5. Global Notification Listener
    const notificationForm = document.getElementById('globalNotificationForm');
    if (notificationForm) {
        notificationForm.addEventListener('submit', handleNotificationSubmit);
    }

    // 6. Logout Listener
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }
});