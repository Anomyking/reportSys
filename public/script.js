/************************************************************
 * GLOBAL CONSTANTS & CONFIG
 ************************************************************/
const API_URL = window.CONFIG.API_URL;
const token = localStorage.getItem("token");
let refreshInterval = null;

/************************************************************
 * UTILITY FUNCTIONS
 ************************************************************/
function redirectTo(page) {
    window.location.href = `/${page}`;
}

function showAlert(msg) {
    alert(msg);
}

function getStatusColor(status) {
    const normalizedStatus = status ? status.toLowerCase() : '';
    const colors = {
        'approved': 'green',
        'rejected': 'red',
        'pending': '#FF0B55' // Changed to a more standard pending color, was bright pink
    };
    return colors[normalizedStatus] || '#E67E22'; // Default color
}

async function apiFetch(endpoint, options = {}, requiresAuth = true) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (requiresAuth) {
        if (!token) {
            redirectTo("login.html");
            throw new Error("Authentication token missing.");
        }
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Special case for FormData (file uploads) - do not set Content-Type JSON
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
    });

    const contentType = res.headers.get("content-type");
    const data = contentType && contentType.includes("application/json") ? await res.json() : {};

    if (!res.ok) {
        const errorMessage = data.message || `API call failed with status: ${res.status}`;
        throw new Error(errorMessage);
    }
    
    return data.data !== undefined ? data.data : data;
}

/************************************************************
 * AUTHENTICATION HANDLERS
 ************************************************************/
function setupRegisterForm() {
    const registerForm = document.getElementById("registerForm");
    if (!registerForm) return;

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name")?.value.trim();
        const email = document.getElementById("email")?.value.trim();
        const password = document.getElementById("password")?.value.trim();
        const role = document.getElementById("role")?.value || "user";

        if (!name || !email || !password) {
            return showAlert("Please fill out all required fields.");
        }
        
        try {
            await apiFetch("/auth/register", {
                method: "POST",
                body: JSON.stringify({ name, email, password, role }),
            }, false);

            showAlert("✅ Registration successful! Redirecting...");
            redirectTo("login.html");
        } catch (err) {
            showAlert("Error: " + err.message);
        }
    });
}

function setupLoginForm() {
    const loginForm = document.getElementById("loginForm");
    if (!loginForm) return;

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail")?.value.trim();
        const password = document.getElementById("loginPassword")?.value.trim();
        
        if (!email || !password) {
            return showAlert("Please enter your email and password.");
        }

        try {
            const data = await apiFetch("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email, password }),
            }, false);

            localStorage.setItem("token", data.token);
            localStorage.setItem("name", data.name);
            localStorage.setItem("role", data.role);

            const redirectPaths = {
                'superadmin': 'superadmin-dashboard.html',
                'admin': 'admin-dashboard.html',
                'user': 'dashboard.html'
            };
            redirectTo(redirectPaths[data.role] || 'dashboard.html');
        } catch (err) {
            showAlert("Error: " + err.message);
        }
    });
}

/************************************************************
 * NAVIGATION
 ************************************************************/
function setupNavigation() {
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            
            if (targetId === '#' || !targetId) { 
                return; 
            }

            document.querySelector('.sidebar nav a.active')?.classList.remove('active');
            this.classList.add('active');

            document.querySelectorAll('.content section').forEach(section => {
                section.style.display = 'none';
            });
            
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
                
                if (targetId === '#profileSection') {
                    loadProfileData();
                }
                
                // 🔹 FIX: Use '.open' to match your CSS
                document.querySelector('.sidebar')?.classList.remove('open');
            }
        });
    });

    const userName = document.getElementById("userName");
    if (userName) userName.textContent = "👤 " + (localStorage.getItem("name") || "User");

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            localStorage.clear();
            redirectTo("login.html");
        });
    }
    
    const firstSectionLink = document.querySelector('.sidebar nav a');
    if (firstSectionLink) {
        firstSectionLink.click();
    }
}

// NEW: Hamburger Button Logic
function setupHamburger() {
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const sidebar = document.querySelector(".sidebar");
    if (hamburgerBtn && sidebar) {
        hamburgerBtn.addEventListener("click", () => {
            // 🔹 FIX: Use '.open' to match your CSS
            sidebar.classList.toggle("open");
        });
    }
}

/************************************************************
 * REPORT MANAGEMENT
 ************************************************************/
function setupReportForm() {
    const reportForm = document.getElementById("newReportForm");
    if (!reportForm) return;

    if (!token) redirectTo("login.html");

    reportForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const formData = new FormData(reportForm);
        
        // Get the selected urgency value
        const urgencyInput = document.querySelector('input[name="urgency"]:checked');
        const urgency = urgencyInput ? urgencyInput.value : 'Normal';
        
        // Remove any existing urgency entries and add the single selected value
        formData.delete('urgency');
        formData.append('urgency', urgency);

        if (!formData.get('title') || !formData.get('description') || !formData.get('category')) {
            return showAlert("⚠️ Please fill in all required fields.");
        }

        try {
            const res = await fetch(`${API_URL}/reports`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to submit report');

            showAlert("✅ Report submitted successfully!");
            reportForm.reset();
            await refreshReports();
            loadFilesHistory();
        } catch (err) {
            console.error('Error submitting report:', err);
            showAlert("Error submitting report: " + (err.message || 'Unknown error occurred'));
        }
    });

    refreshReports();
    loadFilesHistory();

    if (!refreshInterval) {
        refreshInterval = setInterval(refreshReports, 30000);
        console.log("⏱️ Auto-refresh enabled every 30 seconds");
    }
}

async function refreshReports() {
    await loadReports();
    await loadReportAnalytics();
}

// NEW: This function creates the HTML for a single report card
function createReportCardHTML(report) {
    const isPending = report.status.toLowerCase() === 'pending';
    
    // Assumes `report._id` exists from the API response
    const reportId = report._id || report.id; 

    return `
        <div class="report-card">
            <h3>${report.title}</h3>
            <p>${report.description}</p>
            <p><strong>Category:</strong> ${report.category}</p>
            
            <p><strong>Urgency:</strong> 
                <span style="font-weight: bold; color:${report.urgency === 'Urgent' ? '#dc3545' : '#007bff'};">
                    ${report.urgency || 'Normal'}
                </span>
            </p>
            
            <p><strong>Status:</strong> 
                <span style="color:${getStatusColor(report.status)}; font-weight: bold;">
                    ${report.status}
                </span>
            </p>
            <p><small>${new Date(report.createdAt).toLocaleString()}</small></p>
            ${report.attachmentName ? `
                <p>📎 
                    <a href="${report.attachmentPath}" target="_blank">
                        View File: ${report.attachmentName}
                    </a>
                </p>
            ` : ''}

            ${isPending ? `
                <div class="report-actions">
                    <button class="btn-edit" data-report-id="${reportId}">✏️ Edit</button>
                    <button class="btn-delete" data-report-id="${reportId}">🗑️ Delete</button>
                </div>
            ` : ''}
        </div>
    `;
}

async function loadReports() {
    const reportsDiv = document.getElementById("reportsContainer") ?? document.getElementById("reports");
    if (!reportsDiv) {
        console.warn("DOM Error: Reports container element not found.");
        return;
    }

    try {
        const reports = await apiFetch("/reports");

        if (!Array.isArray(reports)) {
            throw new Error("Invalid response from server: Expected array.");
        }

        if (reports.length === 0) {
            reportsDiv.innerHTML = "<p>No reports submitted yet.</p>";
            return;
        }

        // Use the new template function
        reportsDiv.innerHTML = reports.map(createReportCardHTML).join("");

    } catch (err) {
        console.error("Error loading reports:", err);
        reportsDiv.innerHTML = `<p style="color:red;">Error loading reports: ${err.message}</p>`;
    }
}

/************************************************************
 * FILE HISTORY & SEARCH FEATURE
 ************************************************************/
function setupFileSearch() {
    const fileSearchInput = document.getElementById("fileSearchInput");
    if (fileSearchInput) {
        fileSearchInput.addEventListener('input', (e) => {
            loadFilesHistory(e.target.value);
        });
    }
}

async function loadFilesHistory(searchTerm = '') {
    const fileListContainer = document.getElementById("fileListContainer");
    if (!fileListContainer) return;

    try {
        const reports = await apiFetch("/reports");
        let files = reports.filter(r => r.attachmentPath && r.attachmentName);

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            files = files.filter(f => 
                f.attachmentName?.toLowerCase().includes(searchLower) ||
                f.title?.toLowerCase().includes(searchLower)
            );
        }

        if (files.length === 0) {
            fileListContainer.innerHTML = "<p>No files uploaded yet or no files match your search.</p>";
            return;
        }

        fileListContainer.innerHTML = files.map(file => {
            const isImage = file.attachmentMimeType?.startsWith('image/');
            const fileExtension = file.attachmentName?.split('.').pop()?.toUpperCase() || 'FILE';

            let previewContent;
            if (isImage) {
                previewContent = `<img src="${file.attachmentPath}" alt="${file.attachmentName}" class="file-preview-image">`;
            } else if (fileExtension === 'PDF') {
                previewContent = `<div class="file-icon pdf-icon">📄 PDF</div>`;
            } else if (['DOCX', 'DOC'].includes(fileExtension)) {
                previewContent = `<div class="file-icon word-icon">DOC</div>`;
            } else if (['XLSX', 'CSV'].includes(fileExtension)) {
                previewContent = `<div class="file-icon excel-icon">XLS</div>`;
            } else {
                previewContent = `<div class="file-icon general-icon">🔗 ${fileExtension}</div>`;
            }

            return `
                <div class="file-card">
                    <div class="file-preview-area">
                        ${previewContent}
                    </div>
                    <p class="file-name" title="${file.attachmentName}">${file.attachmentName}</p>
                    <small>Report: ${file.title}</small>
                    <a href="${file.attachmentPath}" target="_blank" class="download-link">View/Download</a>
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Error loading file history:", err);
        fileListContainer.innerHTML = `<p style="color:red;">Error loading file history: ${err.message}</p>`;
    }
}

/************************************************************
 * PROFILE MANAGEMENT
 ************************************************************/

async function loadProfileData() {
    const profileNameInput = document.getElementById("profileName");
    const profileEmailInput = document.getElementById("profileEmail");
    const profileRoleInput = document.getElementById("profileRole");
    const profileDeptInput = document.getElementById("profileDepartment");
    const profilePhotoImg = document.getElementById("profilePhotoImg");

    try {
        const user = await apiFetch("/users/me");

        profileNameInput.value = user.name || "";
        profileEmailInput.value = user.email || "";
        profileRoleInput.value = user.role || "";
        if (profileDeptInput) profileDeptInput.value = user.department || "";

        profilePhotoImg.src = user.profilePhotoPath 
    ? user.profilePhotoPath 
    : "/public/userplace.png";

    } catch (err) {
        showAlert("Could not load profile: " + err.message);
    }
}

async function updateProfile() {
    const name = document.getElementById("profileName").value;
    const department = document.getElementById("profileDepartment")?.value;

    try {
        await apiFetch("/users/update-profile", {
            method: "PUT",
            body: JSON.stringify({ name, department }),
        });

        showAlert("✅ Profile updated!");
    } catch (err) {
        showAlert(err.message);
    }
}

async function handleProfilePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePhoto', file);

    try {
        await apiFetch("/users/profile-photo", {
            method: "POST",
            body: formData,
        });

        showAlert("✅ Photo updated!");
        loadProfileData();
        
    } catch (err) {
        // 🔹 FIX: Removed the extra "..." from the error message
        showAlert("Upload failed: " + err.message);
    }
}

function setupProfileSection() {
    const profilePhotoInput = document.getElementById("profilePhotoInput");
    if (profilePhotoInput) {
        profilePhotoInput.addEventListener("change", handleProfilePhotoUpload);
    }

    const saveProfileBtn = document.getElementById("saveProfileBtn");
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener("click", updateProfile);
    }

    const changePasswordForm = document.getElementById("changePasswordForm");
    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById("currentPassword").value;
            const newPassword = document.getElementById("newPassword").value;

            await apiFetch("/users/change-password", {
                method: "PUT",
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            showAlert("✅ Password changed. Login again.");
            localStorage.clear();
            redirectTo("login.html");
        });
    }
}


/************************************************************
 * REPORT ANALYTICS & FILTERING
 ************************************************************/
function setupReportFilters() {
    const filterBtn = document.getElementById("filterBtn");
    if (filterBtn) filterBtn.addEventListener("click", loadReportAnalytics);
}

async function loadReportAnalytics() {
    const category = document.getElementById("categoryFilter")?.value || "";
    const status = document.getElementById("statusFilter")?.value || "";
    const container = document.getElementById("reportsContainer");
    
    try {
        const reports = await apiFetch("/reports");

        if (!Array.isArray(reports)) throw new Error("Invalid report data.");

        let filtered = reports;
        if (category) filtered = filtered.filter(r => r.category === category);
        if (status) filtered = filtered.filter(r => r.status.toLowerCase() === status.toLowerCase());

        renderReports(filtered);
        renderAnalyticsChart(filtered);
    } catch (err) {
        console.error("Report analytics error:", err);
        if (container) {
            container.innerHTML = `<p style="color:red;">Error loading reports: ${err.message}</p>`;
        }
    }
}

function renderReports(reports) {
    const container = document.getElementById("reportsContainer");
    if (!container) return;

    if (!reports || reports.length === 0) {
        container.innerHTML = "<p>No reports found.</p>";
        return;
    }

    // Use the new template function
    container.innerHTML = reports.map(createReportCardHTML).join("");
}

let chartInstance;
function renderAnalyticsChart(reports) {
    const ctx = document.getElementById("reportAnalyticsChart");
    if (!ctx) return;

    const categories = [
        "Finance Report",
        "Sales Report",
        "Resources Report",
        "Inventory Report",
        "Status Report",
    ];

    const counts = categories.map(cat => 
        reports.filter(r => r.category === cat).length
    );

    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: categories,
            datasets: [{
                label: "Reports by Category",
                data: counts,
                backgroundColor: ["#FFDEDE", "#FF0B55", "#CF0F47", "#FFC2C2", "#FF7B9E"],
            }],
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: "📊 Report Overview (Auto-refreshing)" },
            },
            animation: { duration: 800, easing: "easeOutBounce" },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
            },
        },
    });
}

/************************************************************
 * NEW: REPORT ACTIONS (EDIT/DELETE)
 ************************************************************/

function setupReportActions() {
    const reportsContainer = document.getElementById("reportsContainer");
    const modal = document.getElementById("editReportModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const editForm = document.getElementById("editReportForm");

    if (!reportsContainer || !modal || !closeModalBtn || !editForm) {
        console.warn("Edit modal elements not found.");
        return;
    }

    // 1. Listen for clicks on Edit/Delete buttons
    reportsContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-edit")) {
            const reportId = e.target.dataset.reportId;
            openEditModal(reportId);
        }
        if (e.target.classList.contains("btn-delete")) {
            const reportId = e.target.dataset.reportId;
            deleteReport(reportId);
        }
    });

    // 2. Close modal
    closeModalBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // 3. Handle edit form submission
    editForm.addEventListener("submit", handleEditFormSubmit);
}

async function openEditModal(reportId) {
    if (!reportId) return;
    
    try {
        // Fetch the latest data for this specific report
        // Note: Assumes an API endpoint like /reports/:id exists
        const report = await apiFetch(`/reports/${reportId}`); 

        // Populate the modal form
        document.getElementById("editReportId").value = reportId;
        document.getElementById("editTitle").value = report.title;
        document.getElementById("editDescription").value = report.description;
        document.getElementById("editCategory").value = report.category;
        
        // Set urgency radio
        if (report.urgency === 'Urgent') {
            document.getElementById("editUrgencyUrgent").checked = true;
        } else {
            document.getElementById("editUrgencyNormal").checked = true;
        }

        // Show the modal
        document.getElementById("editReportModal").style.display = "block";

    } catch (err) {
        showAlert("Error fetching report details: " + err.message);
    }
}

async function handleEditFormSubmit(e) {
    e.preventDefault();
    
    const reportId = document.getElementById("editReportId").value;
    const data = {
        title: document.getElementById("editTitle").value,
        description: document.getElementById("editDescription").value,
        category: document.getElementById("editCategory").value,
        urgency: document.querySelector('input[name="urgency"]:checked').value
    };

    try {
        // Note: Assumes an API endpoint like PUT /reports/:id exists
        await apiFetch(`/reports/${reportId}`, {
            method: "PUT",
            body: JSON.stringify(data)
        });
        
        showAlert("✅ Report updated successfully!");
        document.getElementById("editReportModal").style.display = "none";
        refreshReports(); // Refresh the list

    } catch (err) {
        showAlert("Error updating report: " + err.message);
    }
}

async function deleteReport(reportId) {
    if (!reportId) return;

    if (!confirm("Are you sure you want to delete this report? This cannot be undone.")) {
        return;
    }

    try {
        // Note: Assumes an API endpoint like DELETE /reports/:id exists
        await apiFetch(`/reports/${reportId}`, {
            method: "DELETE"
        });

        showAlert("✅ Report deleted.");
        refreshReports(); // Refresh the list

    } catch (err) {
        showAlert("Error deleting report: " + err.message);
    }
}

/************************************************************
 * INITIALIZATION
 ************************************************************/
function initializeApp() {
    setupRegisterForm();
    setupLoginForm();
    setupNavigation();
    setupReportForm();
    setupReportFilters();
    setupFileSearch();
    setupProfileSection(); 
    setupHamburger(); // NEW: Initialize hamburger
    setupReportActions(); // NEW: Initialize edit/delete listeners
    
    console.log("✅ Script.js loaded with API_URL:", API_URL);
}

document.addEventListener('DOMContentLoaded', initializeApp);