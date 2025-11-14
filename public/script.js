// script.js
const API_URL = "https://hr-1-ck3i.onrender.com";

// ---------- Auth ----------

// (toggleSignupHrAccess is no longer needed)
// function toggleSignupHrAccess() { ... }


async function signup() {
  const name = document.getElementById("signupName")?.value.trim() || "";
  const email = document.getElementById("signupEmail")?.value.trim() || "";
  const password = document.getElementById("signupPassword")?.value || "";
  const confirmPassword = document.getElementById("signupConfirmPassword")?.value || "";

  // Role and AccessCode logic removed
  
  if (!name || !email || !password || !confirmPassword) {
    showToast("Please fill out all required fields.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showToast("Passwords do not match.", "error");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Only send name, email, password. Role is set by server.
      body: JSON.stringify({ name, email, password }) 
    });

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Signup failed.", "error");
      return;
    }

    showToast("Signup successful! You can now log in.", "success");
    showLogin();
  } catch (err) {
    console.error("Signup Error:", err);
    showToast("An error occurred during signup.", "error");
  }
}



async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("currentUser", JSON.stringify({ name: data.name, role: data.role }));
      showToast(`Welcome, ${data.name}! Login successful.`, "success");
      showDashboard();
    } else {
      showToast(data.message || "Login failed", "error");
    }
  } catch (err) {
    showToast("Network error: " + err.message, "error");
  }
}


function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("currentUser");
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("authBox").style.display = "block";
  showLogin();
}

// ---------- UI helpers ----------

/**
 * Toggles password visibility for an input field.
 * @param {string} inputId The ID of the password input field.
 * @param {HTMLElement} icon The <img> element that was clicked.
 */
function togglePassword(inputId, icon) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    icon.src = "/img/eye-password-show-svgrepo-com.svg";
  } else {
    input.type = "password";
    icon.src = "/img/eye-password-hide-svgrepo-com.svg";
  }
}

function showSignup() {
  document.getElementById("signupForm").style.display = "block";
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("signupTab").classList.add("active");
  document.getElementById("loginTab").classList.remove("active");
  document.getElementById("toggleText").innerHTML = 'Already have an account? <a href="#" onclick="showLogin()">Login</a>';
}
function showLogin() {
  document.getElementById("signupForm").style.display = "none";
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("loginTab").classList.add("active");
  document.getElementById("signupTab").classList.remove("active");
  document.getElementById("toggleText").innerHTML = 'Don\'t have an account? <a href="#" onclick="showSignup()">Signup</a>';
}

// ---------- Dashboard ----------
function showSection(id) {
  document.querySelectorAll(".main-content .section").forEach(s => s.classList.add("hidden"));
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");

  // Refresh employees when opening Payroll
  if (id === "payrollSection") {
    const user = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (user && user.role === "HR") {
      loadEmployees();
    }
  }
}


// ---------- Profile ----------
async function loadProfile() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) document.getElementById("profileName").value = data.name || "";
  } catch (err) {
    console.error(err);
  }
}

async function updateProfile() {
  try {
    const name = document.getElementById("profileName").value.trim();
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, "success");
      const user = JSON.parse(localStorage.getItem("currentUser"));
      user.name = name;
      localStorage.setItem("currentUser", JSON.stringify(user));
      document.getElementById("userName").innerText = name;
    } else
    showToast(data.message || "Update failed", "error");
  } catch (err) {
    showToast("Error: " + err.message, "error");
  }
}

// ---------- Time In / Time Out ----------
async function markTimeIn() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/timein`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, "success");
      loadTimeIn();
    } else showToast(data.message || "Failed", "error");
  } catch (err) {
    showToast("Error: " + err.message, "error");
  }
}
async function loadTimeIn() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/timein`, { headers: { Authorization: `Bearer ${token}` } });
    const records = await res.json();
    const html = (records && records.length)
      ? `<table class="records-table"><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Timestamp (PHT)</th></tr></thead><tbody>${records
          .map((r,i)=>`<tr><td>${i+1}</td><td>${r.name}</td><td>${r.email}</td><td>${new Date(r.timestamp).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td></tr>`).join("")}</tbody></table>`
      : "<p>No Time In records yet.</p>";
    document.getElementById("timeInRecords").innerHTML = html;
  } catch (err) { console.error(err); }
}

async function markTimeOut() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/timeout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, "success");
      loadTimeOut();
    } else  showToast(data.message || "Failed", "error");
  } catch (err) { showToast("Error: " + err.message, "error"); }
}
async function loadTimeOut() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/timeout`, { headers: { Authorization: `Bearer ${token}` } });
    const records = await res.json();
    const html = (records && records.length)
      ? `<table class="records-table"><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Timestamp (PHT)</th></tr></thead><tbody>${records
          .map((r,i)=>`<tr><td>${i+1}</td><td>${r.name}</td><td>${r.email}</td><td>${new Date(r.timestamp).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td></tr>`).join("")}</tbody></table>`
      : "<p>No Time Out records yet.</p>";
    document.getElementById("timeOutRecords").innerHTML = html;
  } catch (err) { console.error(err); }
}

// ---------- Leave ----------
async function submitLeave() {
  try {
    const reason = document.getElementById("leaveReason").value.trim();
    const from = document.getElementById("leaveFrom").value;
    const to = document.getElementById("leaveTo").value;
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason, from, to })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, "success");
      loadLeaves();
    } else  showToast(data.message || "Failed", "error");
  } catch (err) { showToast("Error: " + err.message, "error"); }
}
async function loadLeaves() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/leave`, { headers: { Authorization: `Bearer ${token}` } });
    const records = await res.json();
    const html = (records && records.length)
      ? `<table class="records-table"><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Reason</th><th>From</th><th>To</th><th>Submitted</th><th>Status</th></tr></thead><tbody>${records
          .map((r,i)=>`<tr>
            <td>${i+1}</td>
            <td>${r.name}</td>
            <td>${r.email}</td>
            <td>${r.reason}</td>
            <td>${r.from?new Date(r.from).toLocaleDateString("en-PH"):"-"}</td>
            <td>${r.to?new Date(r.to).toLocaleDateString("en-PH"):"-"}</td>
            <td>${new Date(r.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td>
            <td>${r.status}</td>
          </tr>`).join("")}</tbody></table>`
      : "<p>No leave records yet.</p>";
    document.getElementById("leaveRecords").innerHTML = html;
  } catch (err) { console.error(err); }
}

// HR: Load all leave requests
async function loadHRLeaves() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/admin/leaves`, { headers: { Authorization: `Bearer ${token}` } });
    const records = await res.json();
    
    const html = (records && records.length)
      ? records.map(r => `<tr>
            <td>${r.name} <small>(${r.email})</small></td>
            <td>${r.reason}</td>
            <td>${r.from ? new Date(r.from).toLocaleDateString("en-PH") : "-"}</td>
            <td>${r.to ? new Date(r.to).toLocaleDateString("en-PH") : "-"}</td>
            <td>${r.status}</td>
            <td>
              ${r.status === 'Pending' ? `
                <button onclick="updateLeaveStatus('${r._id}', 'Approved')" style="max-width:100px; padding: 5px 8px; font-size: 0.9rem; margin: 2px; background: #bfa074;">Approve</button>
                <button onclick="updateLeaveStatus('${r._id}', 'Rejected')" style="max-width:100px; padding: 5px 8px; font-size: 0.9rem; margin: 2px; background: #a4845c;">Reject</button>
              ` : `<span>${r.status}</span>`}
            </td>
          </tr>`).join("")
      : "<tr><td colspan='6'>No leave requests found.</td></tr>";
    
    const tableBody = document.getElementById("hrLeaveTableBody");
    if (tableBody) tableBody.innerHTML = html;
    
  } catch (err) { console.error(err); }
}

// HR: Approve or Reject a leave request
async function updateLeaveStatus(leaveId, newStatus) {
  if (!confirm(`Are you sure you want to ${newStatus.toLowerCase()} this leave request?`)) {
    return;
  }
  
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/admin/leaves/${leaveId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (res.ok) {
      showToast(data.message, "success");
      loadHRLeaves(); // Refresh the list
    } else {
      showToast(data.message || "Failed to update", "error");
    }
  } catch (err) {
    showToast("Error: " + err.message, "error");
  }
}

// ---------- HR employee management ----------
async function loadEmployees() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/employees`, { headers: { Authorization: `Bearer ${token}` } });
    const employees = await res.json();

    // Build employee management table
    const body = (employees && employees.length)
      ? employees.map(e => `<tr>
          <td>${e.name}</td>
          <td>${e.email}</td>
          <td>${e.department || "-"}</td>
          <td><button onclick="editEmployee('${e._id}','${escapeHtml(e.name)}','${escapeHtml(e.email)}','${escapeHtml(e.department||"")}')">Edit</button></td>
        </tr>`).join("")
      : "<tr><td colspan='4'>No employees yet.</td></tr>";
    document.getElementById("employeeTableBody").innerHTML = body;

    // ✅ Populate Payroll dropdown too
    const payrollSelect = document.getElementById("payrollEmpId");
    if (payrollSelect) {
      payrollSelect.innerHTML = employees.length
        ? employees.map(e => `<option value="${e._id}">${e.name} (${e.email})</option>`).join("")
        : "<option value=''>No employees</option>";
    }
  } catch (err) { console.error(err); }
}


async function addEmployee() {
  try {
    const name = document.getElementById("empName").value.trim();
    const email = document.getElementById("empEmail").value.trim();
    const password = document.getElementById("empPassword").value;
    const department = document.getElementById("empDepartment").value.trim();
    const role = document.getElementById("empRole").value; // Get role from admin form
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      // Send role to server
      body: JSON.stringify({ name, email, password, department, role }) 
    });
    const data = await res.json();
    if (res.ok) {
      showToast("User added", "success");
      document.getElementById("empName").value = "";
      document.getElementById("empEmail").value = "";
      document.getElementById("empPassword").value = "";
      document.getElementById("empDepartment").value = "";
      document.getElementById("empRole").value = "Employee"; // Reset dropdown
      loadEmployees();
    } else  showToast(data.message || "Error adding user", "error");
  } catch (err) { showToast("Error: "+err.message, "error"); }
}

function editEmployee(id, name, email, department) {
  document.getElementById("editEmpId").value = id;
  document.getElementById("editEmpName").value = unescapeHtml(name);
  document.getElementById("editEmpEmail").value = unescapeHtml(email);
  document.getElementById("editEmpDepartment").value = unescapeHtml(department);
  document.getElementById("editEmployeeForm").style.display = "block";
}

async function updateEmployee() {
  try {
    const id = document.getElementById("editEmpId").value;
    const name = document.getElementById("editEmpName").value.trim();
    const email = document.getElementById("editEmpEmail").value.trim();
    const department = document.getElementById("editEmpDepartment").value.trim();
    // Note: Role editing is not implemented, only name/email/dept
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email, department })
    });
    const data = await res.json();
    if (res.ok) {
      showToast("Employee updated", "success");
      document.getElementById("editEmployeeForm").style.display = "none";
      loadEmployees();
    } else  showToast(data.message || "Update failed", "error");
  } catch (err) { showToast("Error: "+err.message, "error"); }
}

// small helpers to avoid breaking HTML when injecting values
function escapeHtml(str = "") {
  return String(str).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function unescapeHtml(str = "") {
  return String(str).replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
}

// Auto-check on load
window.onload = () => {
  const user = localStorage.getItem("currentUser");
  if (user) showDashboard();
  else showLogin();
};

// --- Payroll (HR) ---
async function generatePayslip() {
  const empId = document.getElementById("payrollEmpId").value;
  const month = document.getElementById("payrollMonth").value;
  const basicSalary = parseFloat(document.getElementById("payrollBasic").value) || 0;
  const overtimePay = parseFloat(document.getElementById("payrollOvertime").value) || 0;
  const allowances = parseFloat(document.getElementById("payrollAllowances").value) || 0;
  const sss = parseFloat(document.getElementById("payrollSSS").value) || 0;
  const philhealth = parseFloat(document.getElementById("payrollPhilHealth").value) || 0;
  const pagibig = parseFloat(document.getElementById("payrollPagibig").value) || 0;
  const tax = parseFloat(document.getElementById("payrollTax").value) || 0;

  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/payslips`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId: empId, month, basicSalary, overtimePay, allowances, sss, philhealth, pagibig, tax })
    });
    const data = await res.json();
    if (res.ok)  showToast("Payslip generated!", "success");
    else  showToast(data.message || "Error", "error");
  } catch (err) { showToast("Error: " + err.message, "error"); }
}

// --- Employee View Payslips ---
async function viewPayslips() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/payslips`, { headers: { Authorization: `Bearer ${token}` } });
    const slips = await res.json();
    document.getElementById("payslipContainer").innerHTML = slips.length
      ? slips.map(s => `
        <div class="payslip-card" style="background:#fff; border:1px solid #e7d9c4; border-radius:8px; padding:12px 16px; margin-bottom:12px; max-width: 350px;">
          <h4 style="margin-bottom:10px; color:#7c5c36;">${s.month} Payslip</h4>
          <table style="width:100%; font-size:0.95rem;">
            <tr><td>Basic Salary</td><td style="text-align:right;">₱${(s.basicSalary||0).toLocaleString()}</td></tr>
            <tr><td>Overtime Pay</td><td style="text-align:right;">₱${(s.overtimePay||0).toLocaleString()}</td></tr>
            <tr><td>Allowances</td><td style="text-align:right;">₱${(s.allowances||0).toLocaleString()}</td></tr>
            <tr><td colspan="2" style="padding-top:8px;"><b>Deductions</b></td></tr>
            <tr><td style="padding-left:10px;">SSS</td><td style="text-align:right;">- ₱${(s.sss||0).toLocaleString()}</td></tr>
            <tr><td style="padding-left:10px;">PhilHealth</td><td style="text-align:right;">- ₱${(s.philhealth||0).toLocaleString()}</td></tr>
            <tr><td style="padding-left:10px;">Pag-IBIG</td><td style="text-align:right;">- ₱${(s.pagibig||0).toLocaleString()}</td></tr>
            <tr><td style="padding-left:10px;">Tax</td><td style="text-align:right;">- ₱${(s.tax||0).toLocaleString()}</td></tr>
            <tr style="border-top:1px solid #e7d9c4; font-size:1.05rem; font-weight:bold;"><td style="padding-top:8px;"><b>Net Pay</b></td><td style="text-align:right; padding-top:8px;"><b>₱${(s.netSalary||0).toLocaleString()}</b></td></tr>
          </table>
          <p style="font-size:0.8rem; margin-top:10px; color:#a4845c;"><small>Generated: ${new Date(s.generatedAt).toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</small></p>
        </div>`).join("")
      : "<p>No payslips yet.</p>";
  } catch (err) { console.error(err); }
}

// --- Reports (HR) ---
async function viewReports() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/reports/attendance`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) {
      document.getElementById("reportTableBody").innerHTML =
        data.timeins.map(r => `<tr><td>${r.name}</td><td>${r.email}</td><td>IN</td><td>${new Date(r.timestamp).toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</td></tr>`).join("") +
        data.timeouts.map(r => `<tr><td>${r.name}</td><td>${r.email}</td><td>OUT</td><td>${new Date(r.timestamp).toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</td></tr>`).join("");
    }
  } catch (err) { console.error(err); }
}

// --- Dashboard Role Handling ---
function showDashboard() {
  const user = JSON.parse(localStorage.getItem("currentUser") || "null");
  if (!user) return showLogin();

  document.getElementById("authBox").style.display = "none";
  document.getElementById("dashboard").style.display = "flex";

  document.getElementById("userName").innerText = user.name;
  document.getElementById("userRole").innerText = user.role;

  if (user.role === "HR") {
    document.getElementById("leaveMenu").style.display = "none";
    document.getElementById("hrMenu").style.display = "block";
    document.getElementById("payrollMenu").style.display = "block";
    document.getElementById("reportsMenu").style.display = "block";
    loadEmployees();
    loadHRLeaves();
  } else {
document.getElementById("leaveMenu").style.display = "block"; // Show employee leave
    document.getElementById("hrLeaveMenu").style.display = "none";
    document.getElementById("hrMenu").style.display = "none";
    document.getElementById("payrollMenu").style.display = "none";
    document.getElementById("reportsMenu").style.display = "none";
  }

  loadProfile();
  loadTimeIn();
  loadTimeOut();
  loadLeaves();
  showSection("profileSection");
}

// --- Toast Notification ---
function showToast(message, type = "info") {
  let toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => document.body.removeChild(toast), 400);
  }, 2500);
}