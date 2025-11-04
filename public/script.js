/************************************************************
 * GLOBAL CONSTANTS & CONFIG
 ************************************************************/
const API_URL = window.CONFIG.API_URL;
const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
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
    const colors = {
        'Approved': 'green',
        'Rejected': 'red',
        'pending': '#FF0B55'
    };
    return colors[status] || '#FF0B55';
}

/************************************************************
 * AUTHENTICATION HANDLERS
 ************************************************************/
// Register Form
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        const roleSelect = document.getElementById("role");
        const role = roleSelect ? roleSelect.value : "user";

        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, role }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Registration failed");

            showAlert("✅ Registration successful! Redirecting...");
            redirectTo("login.html");
        } catch (err) {
            showAlert("Error: " + err.message);
        }
    });
}

// Login Form
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Login failed");

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
// Sidebar Navigation
document.querySelectorAll('.sidebar nav a').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();

        // Update active class
        document.querySelector('.sidebar nav a.active')?.classList.remove('active');
        this.classList.add('active');

        // Show target section
        const targetId = this.getAttribute('href');
        document.querySelectorAll('.content section').forEach(section => {
            section.style.display = 'none';
        });
        document.querySelector(targetId).style.display = 'block';
    });
});

// Dashboard Username & Logout
const userName = document.getElementById("userName");
if (userName) userName.textContent = "👤 " + (localStorage.getItem("name") || "User");

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.clear();
        redirectTo("login.html");
    });
}

/************************************************************
 * REPORT MANAGEMENT
 ************************************************************/
// Report Submission
const reportForm = document.getElementById("newReportForm");
if (reportForm) {
    if (!token) redirectTo("login.html");

    reportForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("title").value.trim();
        const description = document.getElementById("description").value.trim();
        const category = document.getElementById("category").value;

        if (!title || !description || !category)
            return showAlert("⚠️ Please fill in all fields.");

        try {
            const res = await fetch(`${API_URL}/reports`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ title, description, category }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            showAlert("✅ Report submitted successfully!");
            reportForm.reset();
            await refreshReports();
        } catch (err) {
            showAlert("Error submitting report: " + err.message);
        }
    });

    refreshReports();

    // Auto refresh every 30 seconds
    if (!refreshInterval) {
        refreshInterval = setInterval(refreshReports, 30000);
        console.log("⏱️ Auto-refresh enabled every 30 seconds");
    }
}

// Load Reports
async function refreshReports() {
    await loadReports();
    await loadReportAnalytics();
}

async function loadReports() {
    const reportsDiv = document.getElementById("reportsContainer") || document.getElementById("reports");
    if (!reportsDiv) return;

    try {
        const res = await fetch(`${API_URL}/reports`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`Failed to fetch reports (${res.status})`);
        const { data } = await res.json();

        if (!Array.isArray(data)) throw new Error("Invalid response from server");

        if (data.length === 0) {
            reportsDiv.innerHTML = "<p>No reports submitted yet.</p>";
            return;
        }

        reportsDiv.innerHTML = data.map(report => `
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
    } catch (err) {
        console.error("Error loading reports:", err);
        reportsDiv.innerHTML = `<p style="color:red;">Error loading reports: ${err.message}</p>`;
    }
}

/************************************************************
 * ADMIN FEATURES
 ************************************************************/
// Request Admin Access
const requestAdminBtn = document.getElementById("requestAdminBtn");
if (requestAdminBtn) {
    requestAdminBtn.addEventListener("click", async () => {
        try {
            const res = await fetch(`${API_URL}/users/request-admin`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

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
const filterBtn = document.getElementById("filterBtn");
if (filterBtn) filterBtn.addEventListener("click", loadReportAnalytics);

async function loadReportAnalytics() {
    const category = document.getElementById("categoryFilter")?.value || "";
    const status = document.getElementById("statusFilter")?.value || "";
    const container = document.getElementById("reportsContainer");

    try {
        const res = await fetch(`${API_URL}/reports`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const { data } = await res.json();

        if (!Array.isArray(data)) throw new Error("Invalid report data.");

        let filtered = data;
        if (category) filtered = filtered.filter(r => r.category === category);
        if (status) filtered = filtered.filter(r => r.status === status);

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

    container.innerHTML = reports.map(report => `
        <div class="report-card">
            <h3>${report.title}</h3>
            <p>${report.description}</p>
            <p><strong>Category:</strong> ${report.category}</p>
            <p><strong>Status:</strong> 
                <span style="color:${getStatusColor(report.status)};">${report.status}</span>
            </p>
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

console.log("✅ Script.js loaded with API_URL:", API_URL);