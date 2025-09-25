// script.js
const API_URL = "http://localhost:5000";

// ---------- Auth ----------
async function signup() {
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const role = document.getElementById("signupRole").value;

  try {
    const res = await fetch(`${API_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Signup successful — please login.");
      showLogin();
    } else {
      alert(data.message || "Signup failed");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("currentUser", JSON.stringify({ name: data.name, role: data.role }));
      showDashboard();
    } else {
      alert(data.message || "Login failed");
    }
  } catch (err) {
    alert("Network error: " + err.message);
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
function showSignup() {
  document.getElementById("signupForm").style.display = "block";
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("formTitle").innerText = "Signup";
  document.getElementById("toggleText").innerHTML = 'Already have an account? <a href="#" onclick="showLogin()">Login</a>';
}
function showLogin() {
  document.getElementById("signupForm").style.display = "none";
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("formTitle").innerText = "Login";
  document.getElementById("toggleText").innerHTML = 'Don\'t have an account? <a href="#" onclick="showSignup()">Signup</a>';
}

// ---------- Dashboard ----------
function showDashboard() {
  const user = JSON.parse(localStorage.getItem("currentUser") || "null");
  if (!user) return showLogin();

  document.getElementById("authBox").style.display = "none";
  document.getElementById("dashboard").style.display = "flex";

  document.getElementById("userName").innerText = user.name;
  document.getElementById("userRole").innerText = user.role;

  // show HR menu if HR
  if (user.role === "HR") {
    document.getElementById("hrMenu").style.display = "block";
  } else {
    document.getElementById("hrMenu").style.display = "none";
  }

  loadProfile();
  loadTimeIn();
  loadTimeOut();
  loadLeaves();
  if (user.role === "HR") loadEmployees();

  showSection("profileSection");
}

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
      alert(data.message);
      const user = JSON.parse(localStorage.getItem("currentUser"));
      user.name = name;
      localStorage.setItem("currentUser", JSON.stringify(user));
      document.getElementById("userName").innerText = name;
    } else alert(data.message || "Update failed");
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// ---------- Time In / Time Out ----------
async function markTimeIn() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/timein`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadTimeIn();
    } else alert(data.message || "Failed");
  } catch (err) {
    alert("Error: " + err.message);
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
      alert(data.message);
      loadTimeOut();
    } else alert(data.message || "Failed");
  } catch (err) { alert("Error: " + err.message); }
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
      alert(data.message);
      loadLeaves();
    } else alert(data.message || "Failed");
  } catch (err) { alert("Error: " + err.message); }
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

// ---------- Payslips ----------
async function viewPayslips() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/payslips`, { headers: { Authorization: `Bearer ${token}` } });
    const slips = await res.json();
    const html = (slips && slips.length)
      ? `<table class="records-table"><thead><tr><th>#</th><th>Month</th><th>Basic</th><th>Deductions</th><th>Net</th><th>Generated</th></tr></thead><tbody>${slips
          .map((s,i)=>`<tr><td>${i+1}</td><td>${s.month}</td><td>₱${(s.basicSalary||0).toLocaleString()}</td><td>₱${(s.deductions||0).toLocaleString()}</td><td>₱${(s.netSalary||0).toLocaleString()}</td><td>${new Date(s.generatedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}</td></tr>`).join("")}</tbody></table>`
      : "<p>No payslips yet.</p>";
    document.getElementById("payslipContainer").innerHTML = html;
  } catch (err) { console.error(err); }
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
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/employees`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email, password, department })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Employee added");
      document.getElementById("empName").value = "";
      document.getElementById("empEmail").value = "";
      document.getElementById("empPassword").value = "";
      document.getElementById("empDepartment").value = "";
      loadEmployees();
    } else alert(data.message || "Error adding employee");
  } catch (err) { alert("Error: "+err.message); }
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
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/employees/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email, department })
    });
    const data = await res.json();
    if (res.ok) {
      alert("Employee updated");
      document.getElementById("editEmployeeForm").style.display = "none";
      loadEmployees();
    } else alert(data.message || "Update failed");
  } catch (err) { alert("Error: "+err.message); }
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
    if (res.ok) alert("Payslip generated!");
    else alert(data.message || "Error");
  } catch (err) { alert("Error: " + err.message); }
}

// --- Employee View Payslips ---
async function viewPayslips() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_URL}/payslips`, { headers: { Authorization: `Bearer ${token}` } });
    const slips = await res.json();
    document.getElementById("payslipContainer").innerHTML = slips.length
      ? slips.map(s => `
        <div class="payslip-card">
          <h4>${s.month} Payslip</h4>
          <table>
            <tr><td>Basic Salary</td><td>₱${s.basicSalary.toLocaleString()}</td></tr>
            <tr><td>Overtime Pay</td><td>₱${s.overtimePay.toLocaleString()}</td></tr>
            <tr><td>Allowances</td><td>₱${s.allowances.toLocaleString()}</td></tr>
            <tr><td colspan="2"><b>Deductions</b></td></tr>
            <tr><td>SSS</td><td>₱${s.sss.toLocaleString()}</td></tr>
            <tr><td>PhilHealth</td><td>₱${s.philhealth.toLocaleString()}</td></tr>
            <tr><td>Pag-IBIG</td><td>₱${s.pagibig.toLocaleString()}</td></tr>
            <tr><td>Tax</td><td>₱${s.tax.toLocaleString()}</td></tr>
            <tr><td><b>Net Pay</b></td><td><b>₱${s.netSalary.toLocaleString()}</b></td></tr>
          </table>
          <p><small>Generated: ${new Date(s.generatedAt).toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</small></p>
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
  const user = JSON.parse(localStorage.getItem("currentUser")||"null");
  if (!user) return showLogin();
  document.getElementById("authBox").style.display="none";
  document.getElementById("dashboard").style.display="flex";
  document.getElementById("userName").innerText=user.name;
  document.getElementById("userRole").innerText=user.role;
  if (user.role==="HR") {
    document.getElementById("leaveMenu").style.display="none";
    document.getElementById("hrMenu").style.display="block";
    document.getElementById("payrollMenu").style.display="block";
    document.getElementById("reportsMenu").style.display="block";
    loadEmployees();
  } else {
    document.getElementById("leaveMenu").style.display="block";
    document.getElementById("hrMenu").style.display="none";
    document.getElementById("payrollMenu").style.display="none";
    document.getElementById("reportsMenu").style.display="none";
  }
  loadProfile(); loadTimeIn(); loadTimeOut(); loadLeaves();
  showSection("profileSection");
}

// --- Show dashboard updates ---
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
  } else {
    document.getElementById("leaveMenu").style.display = "block";
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
