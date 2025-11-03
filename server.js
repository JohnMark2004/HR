// server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const moment = require("moment-timezone");
const path = require('path'); 

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// --- Serve frontend build ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Schemas ---
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["Employee", "HR"], default: "Employee" },
  department: { type: String, default: "" }
});
const User = mongoose.model("User", UserSchema);

const TimeInSchema = new mongoose.Schema({
  userId: String,
  name: String,
  email: String,
  timestamp: { type: Date, default: () => moment().tz("Asia/Manila").toDate() }
});
const TimeIn = mongoose.model("TimeIn", TimeInSchema);

const TimeOutSchema = new mongoose.Schema({
  userId: String,
  name: String,
  email: String,
  timestamp: { type: Date, default: () => moment().tz("Asia/Manila").toDate() }
});
const TimeOut = mongoose.model("TimeOut", TimeOutSchema);

const LeaveSchema = new mongoose.Schema({
  userId: String,
  name: String,
  email: String,
  reason: String,
  from: Date,
  to: Date,
  createdAt: { type: Date, default: () => moment().tz("Asia/Manila").toDate() },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" }
});
const Leave = mongoose.model("Leave", LeaveSchema);

const PayslipSchema = new mongoose.Schema({
  userId: String,
  month: String,
  basicSalary: Number,
  overtimePay: { type: Number, default: 0 },
  allowances: { type: Number, default: 0 },
  sss: { type: Number, default: 0 },
  philhealth: { type: Number, default: 0 },
  pagibig: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  netSalary: Number,
  generatedAt: { type: Date, default: () => moment().tz("Asia/Manila").toDate() }
});
const Payslip = mongoose.model("Payslip", PayslipSchema);

// --- Static Admin Account Creation ---
async function createStaticAdmin() {
  try {
    const adminEmail = "admin@portal.com";
    const adminPass = "adminpass";
    const adminName = "Admin User";

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      // console.log("✅ Static HR Admin account already exists.");
      return;
    }

    const hashed = await bcrypt.hash(adminPass, 10);
    const admin = new User({
      name: adminName,
      email: adminEmail,
      password: hashed,
      role: "HR",
      department: "Administration"
    });
    await admin.save();
    console.log("✅ Static HR Admin account created.");
  } catch (err) {
    console.error("❌ Error creating static admin:", err.message);
  }
}

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ MongoDB connected");
    createStaticAdmin(); // Create the admin account on connection
  })
  .catch(err => console.error("❌ Mongo error:", err));


// --- Auth Middleware ---
function authenticate(req, res, next) {
  const token = (req.headers["authorization"] || "").split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// --- API Auth Routes ---

// Public Signup - Always creates "Employee"
app.post("/signup", async (req, res) => {
  try {
    // Role and accessCode removed.
    const { name, email, password } = req.body;

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    // Role is hard-coded to "Employee" for security.
    const user = new User({ name, email, password: hashed, role: "Employee" }); 
    await user.save();
    res.json({ message: "Signup successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, name: user.name, role: user.role });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// --- API Profile ---
app.get("/profile", authenticate, async (req, res) => {
  const u = await User.findById(req.user.id).select("-password");
  res.json(u);
});
app.put("/profile", authenticate, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { name: req.body.name });
  res.json({ message: "Profile updated" });
});

// --- API Time In / Out ---
app.post("/timein", authenticate, async (req, res) => {
  const u = await User.findById(req.user.id);
  const rec = new TimeIn({ userId: u._id, name: u.name, email: u.email });
  await rec.save();
  res.json({ message: "Time In recorded", rec });
});
app.get("/timein", authenticate, async (req, res) => {
  res.json(await TimeIn.find({ userId: req.user.id }).sort({ timestamp: -1 }));
});

app.post("/timeout", authenticate, async (req, res) => {
  const u = await User.findById(req.user.id);
  const rec = new TimeOut({ userId: u._id, name: u.name, email: u.email });
  await rec.save();
  res.json({ message: "Time Out recorded", rec });
});
app.get("/timeout", authenticate, async (req, res) => {
  res.json(await TimeOut.find({ userId: req.user.id }).sort({ timestamp: -1 }));
});

// --- API Leave (Employee only) ---
app.post("/leave", authenticate, async (req, res) => {
  if (req.user.role === "HR") return res.status(403).json({ message: "HR cannot file leave" });
  const u = await User.findById(req.user.id);
  const leave = new Leave({ userId: u._id, name: u.name, email: u.email, ...req.body });
  await leave.save();
  res.json({ message: "Leave submitted", leave });
});
app.get("/leave", authenticate, async (req, res) => {
  if (req.user.role === "HR") return res.json([]);
  res.json(await Leave.find({ userId: req.user.id }).sort({ createdAt: -1 }));
});

// --- API Payslips ---
app.get("/payslips", authenticate, async (req, res) => {
  res.json(await Payslip.find({ userId: req.user.id }).sort({ generatedAt: -1 }));
});

// HR creates payslip
app.post("/payslips", authenticate, async (req, res) => {
  if (req.user.role !== "HR") return res.status(403).json({ message: "Denied" });
  const { userId, month, basicSalary, overtimePay, allowances, sss, philhealth, pagibig, tax } = req.body;
  const deductions = (sss||0)+(philhealth||0)+(pagibig||0)+(tax||0);
  const netSalary = (basicSalary||0)+(overtimePay||0)+(allowances||0)-deductions;
  const slip = new Payslip({ userId, month, basicSalary, overtimePay, allowances, sss, philhealth, pagibig, tax, netSalary });
  await slip.save();
  res.json({ message: "Payslip created", slip });
});

// --- API HR User Management ---
app.get("/employees", authenticate, async (req, res) => {
  if (req.user.role !== "HR") return res.status(De3).json({ message: "Denied" });
  // Now returns both Employees and other HR users, but not the user themselves
  res.json(await User.find({ _id: { $ne: req.user.id } }).select("-password"));
});

// Admin creates a new user (Employee or HR)
app.post("/employees", authenticate, async (req, res) => {
  if (req.user.role !== "HR") return res.status(403).json({ message: "Denied" });
  // Role is now sent from the admin's form
  const { name, email, password, department, role } = req.body; 
  if (!role || !['Employee', 'HR'].includes(role)) {
    return res.status(400).json({ message: "Invalid role specified" });
  }
  const hashed = await bcrypt.hash(password, 10);
  const emp = new User({ name, email, password: hashed, role, department });
  await emp.save();
  res.json({ message: "User added", emp });
});

app.put("/employees/:id", authenticate, async (req, res) => {
  if (req.user.role !== "HR") return res.status(403).json({ message: "Denied" });
  // Admin cannot edit role, only name/email/dept
  const { name, email, department } = req.body; 
  res.json({ message: "Employee updated", upd: await User.findByIdAndUpdate(req.params.id, { name, email, department }, { new: true }) });
});

// --- API HR Reports ---
app.get("/reports/attendance", authenticate, async (req, res) => {
  if (req.user.role !== "HR") return res.status(403).json({ message: "Denied" });
  res.json({ timeins: await TimeIn.find().sort({ timestamp: -1 }), timeouts: await TimeOut.find().sort({ timestamp: -1 }) });
});

// --- Frontend Catch-all ---
app.get('/*', (req, res) => { // [THIS IS THE FIXED LINE]
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start Server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});