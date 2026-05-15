const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const protectedRoutes = require("./routes/protectedRoutes");
const examRoutes = require("./routes/examRoutes");
const adminRoutes = require("./routes/adminRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const proctorRoutes = require("./routes/proctorRoutes");
const markingRoutes = require("./routes/markingRoutes");
const auditRoutes = require("./routes/auditRoutes");
const questionBankRoutes = require("./routes/questionBankRoutes");

const academicRoutes = require("./routes/academicRoutes");

dotenv.config();

connectDB();

const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(compression());

const allowedOrigins = [
  "http://localhost:5173",
  "http://192.168.0.111:5173",
  "http://10.115.62.56:5173",
   "http://10.27.109.56:5173",
   "http://192.168.99.56:5173",
   "http://192.168.0.107:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

const sanitizeInput = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== "object") return;

    for (const key in obj) {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else if (typeof obj[key] === "object") {
        sanitizeObject(obj[key]);
      }
    }
  };

  sanitizeObject(req.body);
  sanitizeObject(req.params);
  sanitizeObject(req.query);

  next();
};

app.use(sanitizeInput);

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message,
    },
  });

const globalLimiter = createLimiter(
  15 * 60 * 1000,
  500,
  "Too many requests. Please try again later."
);

const authLimiter = createLimiter(
  15 * 60 * 1000,
  80,
  "Too many authentication requests. Try again later."
);

const loginLimiter = createLimiter(
  15 * 60 * 1000,
  20,
  "Too many login attempts from this device. Try again later."
);

const otpLimiter = createLimiter(
  10 * 60 * 1000,
  5,
  "Too many OTP requests. Try again later."
);

const examLimiter = createLimiter(
  60 * 1000,
  120,
  "Too many exam requests. Slow down."
);

const saveProgressLimiter = createLimiter(
  60 * 1000,
  30,
  "Too many save requests. Please wait."
);

const submitLimiter = createLimiter(
  5 * 60 * 1000,
  10,
  "Too many submit attempts. Please wait."
);

const proctorLimiter = createLimiter(
  60 * 1000,
  80,
  "Too many proctor requests. Please wait."
);

const adminLimiter = createLimiter(
  60 * 1000,
  100,
  "Too many admin requests. Please wait."
);

app.use("/api", globalLimiter);

app.use("/api/auth", authLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/resend-otp", otpLimiter);
app.use("/api/auth/forgot-password", otpLimiter);
app.use("/api/auth/reset-password", otpLimiter);

app.use("/api/exams", examLimiter);
app.use("/api/submissions/save-progress", saveProgressLimiter);
app.use("/api/submissions/submit", submitLimiter);
app.use("/api/proctor", proctorLimiter);
app.use("/api/admin", adminLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/proctor", proctorRoutes);
app.use("/api/marking", markingRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/question-bank", questionBankRoutes);
app.use("/api/academics", academicRoutes);

app.get("/", (req, res) => {
  res.send("Backend Running");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    message: "Exam server is running",
    time: new Date(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    message: "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});