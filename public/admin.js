// --- CONFIGURATION (Assumed to be in config.js or defined globally) ---
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
    document.querySelector(`.sidebar nav a[href="#${sectionId}"]`).classList.add('active');
}

/** Fetches user profile to determine role and department */
async function loadUserProfile() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/profile`, {
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
            window.location.href = 'user-dashboard.html'; // Or login.html
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
        // Since the user is an admin, the default view is Report Management
        loadReports(); 
        loadPromotionRequests();
        if (currentUser.role === 'superadmin') {
             loadAllUsers(); 
             loadSystemNotifications();
        }

        // 4. Set default active section and profile details
        showSection('dashboardOverview');
        document.getElementById('profileName').value = data.name;
        document.getElementById('profileEmail').value = data.email;
        document.getElementById('profileRole').value = data.role.toUpperCase();
        document.getElementById('profileDepartment').value = data.department || 'N/A';


    } catch (error) {
        console.error('Initialization error:', error);
        window.location.href = 'login.html';
    }
}

// --- CORE ADMIN DATA LOADING FUNCTIONS ---

/** Loads top-level stats from the backend. */
async function loadDashboardOverview() {
    // This connects to the GET /api/v1/admin/overview route
    try {
        const response = await fetch(`${API_BASE_URL}/admin/overview`, { headers: getAuthHeader() });
        const data = await response.json();
        
        document.getElementById('stat-users-count').textContent = data.users.toLocaleString();
        document.getElementById('stat-reports-count').textContent = data.reports.toLocaleString();
        document.getElementById('stat-admins-count').textContent = data.admins.toLocaleString();
        document.getElementById('stat-pending-count').textContent = data.reportStats.Pending?.toLocaleString() || '0';
        
        // TODO: Call a separate function here to initialize the Chart.js chart 
        // using the reportStats data if needed.

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
        // This connects to the GET /api/v1/admin/reports route
        const response = await fetch(`${API_BASE_URL}/admin/reports${query}`, { headers: getAuthHeader() });
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

    // This connects to the GET /api/v1/admin/users/requests route
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users/requests`, { headers: getAuthHeader() });
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
    // This connects to the GET /api/v1/admin/users route
    if (currentUser.role === 'superadmin') {
         // TODO: Implement the fetch logic and render user list
    }
}

async function loadSystemNotifications() {
     // This connects to the GET /api/v1/admin/notifications/all route
    if (currentUser.role === 'superadmin') {
         // TODO: Implement the fetch logic and render notifications history
    }
}

// --- EVENT HANDLERS (Delegation) ---

/** Handles clicks on action buttons (Approve/Reject) */
async function handleActionClick(event) {
    if (event.target.classList.contains('report-action-btn')) {
        const id = event.target.dataset.id;
        const action = event.target.dataset.action; // e.g., 'Approved' or 'Rejected'
        
        try {
            const response = await fetch(`${API_BASE_URL}/admin/reports/${id}`, {
                method: 'PUT',
                headers: getAuthHeader(),
                body: JSON.stringify({ status: action })
            });
            
            if (!response.ok) throw new Error(`Failed to set status to ${action}`);
            
            alert(`Report ${id} successfully marked as ${action}!`);
            loadReports(); // Reload the list
            loadDashboardOverview(); // Update stats
            
        } catch (error) {
            console.error('Report action error:', error);
            alert(`Error processing request: ${error.message}`);
        }
    }

    if (event.target.classList.contains('request-action-btn')) {
        const id = event.target.dataset.id;
        const action = event.target.dataset.action; // 'approve' or 'reject'
        
        try {
            const response = await fetch(`${API_BASE_URL}/admin/users/${id}/${action}`, {
                method: 'PATCH',
                headers: getAuthHeader()
            });

            if (!response.ok) throw new Error(`Failed to ${action} user promotion.`);

            alert(`User promotion successfully ${action}d!`);
            loadPromotionRequests(); // Reload list
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
        const response = await fetch(`${API_BASE_URL}/admin/notifications`, {
            method: 'POST',
            headers: getAuthHeader(),
            body: JSON.stringify({ message, target })
        });
        
        if (!response.ok) throw new Error('Failed to send notification.');
        
        alert('Global notification sent successfully!');
        document.getElementById('globalNotificationForm').reset();

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

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Profile/Role Check
    loadUserProfile();

    // 2. Navigation Listener
    document.querySelector('.sidebar nav').addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.hash) {
            e.preventDefault();
            showSection(e.target.hash.substring(1));
        }
    });

    // 3. Delegation for Report/Promotion Actions
    document.querySelector('main.content').addEventListener('click', handleActionClick);

    // 4. Filter Button Listener
    document.getElementById('filterReportsBtn').addEventListener('click', loadReports);

    // 5. Global Notification Listener
    const notificationForm = document.getElementById('globalNotificationForm');
    if (notificationForm) {
        notificationForm.addEventListener('submit', handleNotificationSubmit);
    }

    // 6. Logout Listener
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
});