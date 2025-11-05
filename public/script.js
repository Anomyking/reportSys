// script.js

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
        'pending': '#FF0B55'
    };
    return colors[normalizedStatus] || '#FF0B55';
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
            
            // FIX: Prevent crash when href is just '#' (SyntaxError fix)
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

        if (!formData.get('title') || !formData.get('description') || !formData.get('category')) {
            return showAlert("⚠️ Please fill in all required fields.");
        }

        try {
            // NOTE: fetch is used here instead of apiFetch because it handles FormData/file uploads correctly
            const res = await fetch(`${API_URL}/reports`, {
                method: "POST",
                headers: {
                    // Content-Type is intentionally omitted; browser sets it for FormData
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            showAlert("✅ Report submitted successfully!");
            reportForm.reset();
            await refreshReports();
            loadFilesHistory();
        } catch (err) {
            showAlert("Error submitting report: " + err.message);
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

        reportsDiv.innerHTML = reports.map(report => `
            <div class="report-card">
                <h3>${report.title}</h3>
                <p>${report.description}</p>
                <p><strong>Category:</strong> ${report.category}</p>
                <p><strong>Status:</strong> 
                    <span style="color:${getStatusColor(report.status)};">${report.status}</span>
                </p>
                <p><small>${new Date(report.createdAt).toLocaleString()}</small></p>
                ${report.attachmentName ? `
                    <p>📎 
                        <a href="${report.attachmentPath}" target="_blank">
                            View File: ${report.attachmentName}
                        </a>
                    </p>
                ` : ''}
            </div>
        `).join("");
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
                // ✅ FIX: Removed ${API_URL} from src
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
 * ADMIN FEATURES
 ************************************************************/
function setupAdminFeatures() {
    const requestAdminBtn = document.getElementById("requestAdminBtn");
    if (!requestAdminBtn) return;

    requestAdminBtn.addEventListener("click", async () => {
        try {
            // FIX: Added body: JSON.stringify({}) to prevent 400 Bad Request
            const data = await apiFetch("/users/request-admin", {
                method: "POST",
                body: JSON.stringify({}),
            });

            showAlert(data.message);
            requestAdminBtn.disabled = true;
            requestAdminBtn.textContent = "Request Pending";
        } catch (err) {
            showAlert("Error sending request: " + err.message);
        }
    });
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

    // NOTE: This function does not render file links.
    // The loadReports() function above is what renders the "My Reports" list.
    // This renderReports() is only used by the analytics/filtering.
    // If you want this view to also show file links, you must add the link logic here too.
    container.innerHTML = reports.map(report => `
        <div class="report-card">
            <h3>${report.title}</h3>
            <p>${report.description}</p>
            <p><strong>Category:</strong> ${report.category}</p>
            <p><strong>Status:</strong> 
                <span style="color:${getStatusColor(report.status)};">${report.status}</span>
            </p>
            <p><small>${new Date(report.createdAt).toLocaleString()}</small></p>
        </div>
    `).join("");
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
 * INITIALIZATION
 ************************************************************/
function initializeApp() {
    setupRegisterForm();
    setupLoginForm();
    setupNavigation();
    setupReportForm();
    setupAdminFeatures();
    setupReportFilters();
    setupFileSearch();
    
    console.log("✅ Script.js loaded with API_URL:", API_URL);
}

document.addEventListener('DOMContentLoaded', initializeApp);