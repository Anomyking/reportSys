/************************************************************
 * CONFIG
 ************************************************************/
const API_URL = "https://reportsys.onrender.com/api";

/************************************************************
 * Helper Functions
 ************************************************************/
function showAlert(msg) {
  alert(msg);
}

function redirect(page) {
  window.location.href = `/${page}`;
}

/************************************************************
 * REGISTER FORM
 ************************************************************/
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role")
      ? document.getElementById("role").value
      : "user";

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showAlert("✅ Registration successful! Redirecting...");
      redirect("login.html");
    } catch (err) {
      showAlert("Registration failed: " + err.message);
    }
  });
}

/************************************************************
 * LOGIN FORM
 ************************************************************/
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
      if (!res.ok) throw new Error(data.message);

      // ✅ Save user session
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("name", data.name);

      // ✅ Redirect based on role
      if (data.role === "superadmin") redirect("superadmin-dashboard.html");
      else if (data.role === "admin") redirect("admin-dashboard.html");
      else redirect("dashboard.html");
    } catch (err) {
      showAlert("Login failed: " + err.message);
    }
  });
}

/************************************************************
 * FORGOT PASSWORD FORM
 ************************************************************/
const forgotForm = document.getElementById("forgotForm");
if (forgotForm) {
  forgotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail").value.trim();

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showAlert("📧 " + data.message);
    } catch (err) {
      showAlert("Error: " + err.message);
    }
  });
}

/************************************************************
 * RESET PASSWORD FORM
 ************************************************************/
const resetForm = document.getElementById("resetForm");
if (resetForm) {
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const password = document.getElementById("newPassword").value.trim();

    try {
      const res = await fetch(`${API_URL}/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      showAlert("✅ Password reset successful! Redirecting...");
      redirect("login.html");
    } catch (err) {
      showAlert("Error resetting password: " + err.message);
    }
  });
}

/************************************************************
 * LOGOUT BUTTON
 ************************************************************/
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.clear();
    redirect("login.html");
  });
}
