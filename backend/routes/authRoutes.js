const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Subject = require("../models/Subject");
const auditLogger = require("../utils/auditLogger");
const sendEmail = require("../utils/sendEmail");

const {
  authMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket?.remoteAddress ||
    req.ip ||
    ""
  );
};

const getBrowserName = (userAgent = "") => {
  if (userAgent.includes("Edg")) return "Microsoft Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";

  return "Unknown Browser";
};

const getDeviceName = (userAgent = "") => {
  if (/mobile/i.test(userAgent)) return "Mobile";
  if (/tablet/i.test(userAgent)) return "Tablet";
  if (/windows/i.test(userAgent)) return "Windows PC";
  if (/mac/i.test(userAgent)) return "Mac";
  if (/linux/i.test(userAgent)) return "Linux PC";

  return "Unknown Device";
};

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      department,
      stream,
      classSemester,
    } = req.body;

    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({
        message: "All required fields must be filled",
      });
    }

    const nameRegex = /^[A-Za-z\s]+$/;
    const emailRegex = /^[^\s@]+@gmail\.com$/i;
    const phoneRegex = /^[6-9]\d{9}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanDepartment = department ? department.trim() : "";
    const cleanStream = stream ? stream.trim() : "";
    const cleanClassSemester = classSemester ? classSemester.trim() : "";

   

    if (!nameRegex.test(cleanName)) {
      return res.status(400).json({
        message: "Name must contain only letters and spaces",
      });
    }

    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        message: "Enter a valid Gmail address",
      });
    }

    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({
        message: "Phone number must be a valid 10 digit Indian number",
      });
    }

    if (!passwordRegex.test(password.trim())) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters with uppercase, lowercase, and number",
      });
    }

    if (role === "student" && (!cleanStream || !cleanClassSemester)) {
      return res.status(400).json({
        message: "Stream and class are required for students",
      });
    }

    if (role === "faculty" && !cleanDepartment) {
      return res.status(400).json({
        message: "Department is required for faculty",
      });
    }


    const existingEmail = await User.findOne({
      email: cleanEmail,
    });


    if (existingEmail) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const existingPhone = await User.findOne({
      phone: cleanPhone,
    });

    if (existingPhone) {
      return res.status(400).json({
        message: "Phone number already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password: hashedPassword,
      role,
      department: role === "faculty" ? cleanDepartment : "",
      stream: role === "student" ? cleanStream : "",
      classSemester: role === "student" ? cleanClassSemester : "",
      
      subjectSelectionCompleted: false,
      isApproved: role === "student" || role === "admin",
      isEmailVerified: false,
      isBlocked: false,
      sessionVersion: 0,
      emailOtp: otp,
      emailOtpExpires: otpExpiry,
    });

    const emailSent = await sendEmail({
      to: user.email,
      subject: "College Exam System OTP Verification",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>Email Verification</h2>
          <p>Your OTP code is:</p>
          <h1 style="letter-spacing: 5px;">${otp}</h1>
          <p>This OTP will expire in 10 minutes.</p>
        </div>
      `,
    });

    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send OTP email",
      });
    }

    await auditLogger({
      user: user._id,
      action: "REGISTER",
      details: `${role} account created`,
      targetId: user._id,
      req,
    });

    res.status(201).json({
      message: "OTP sent to your email",
      email: user.email,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyPattern || {})[0];

      return res.status(400).json({
        message:
          duplicateField === "phone"
            ? "Phone number already registered"
            : "Email already registered",
      });
    }

    res.status(500).json({
      message: error.message,
    });
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: "Email already verified",
      });
    }

    if (!user.emailOtp || user.emailOtp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (!user.emailOtpExpires || new Date(user.emailOtpExpires) < new Date()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    user.isEmailVerified = true;
    user.emailOtp = null;
    user.emailOtpExpires = null;

    await user.save();

    await auditLogger({
      user: user._id,
      action: "EMAIL_VERIFIED",
      details: "Email verified successfully",
      targetId: user._id,
      req,
    });

    res.json({
      message: "Email verified successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: "Email already verified",
      });
    }

    const otp = generateOtp();

    user.emailOtp = otp;
    user.emailOtpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    const emailSent = await sendEmail({
      to: user.email,
      subject: "College Exam System OTP Verification",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>OTP Verification</h2>
          <p>Your new OTP code is:</p>
          <h1 style="letter-spacing: 5px;">${otp}</h1>
          <p>OTP expires in 10 minutes.</p>
        </div>
      `,
    });

    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send OTP",
      });
    }

    res.json({
      message: "OTP resent successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const otp = generateOtp();

    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await user.save();

    const emailSent = await sendEmail({
      to: user.email,
      subject: "Password Reset OTP",
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>Password Reset</h2>
          <p>Your password reset OTP:</p>
          <h1 style="letter-spacing: 5px;">${otp}</h1>
          <p>OTP expires in 10 minutes.</p>
        </div>
      `,
    });

    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send OTP",
      });
    }

    res.json({
      message: "Password reset OTP sent",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: "All fields required",
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters with uppercase, lowercase, and number",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    if (!user.resetOtpExpires || new Date(user.resetOtpExpires) < new Date()) {
      return res.status(400).json({
        message: "OTP expired",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = null;
    user.resetOtpExpires = null;
    user.sessionVersion += 1;

    await user.save();

    await auditLogger({
      user: user._id,
      action: "PASSWORD_RESET",
      details: "Password reset successful",
      targetId: user._id,
      req,
    });

    res.json({
      message: "Password reset successful",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message: "Your account has been blocked by admin",
      });
    }

    if (user.role !== "admin" && !user.isEmailVerified) {
      return res.status(403).json({
        message: "Please verify your email first",
      });
    }

    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.lockUntil) - new Date()) / (1000 * 60)
      );

      return res.status(403).json({
        message: `Account locked. Try again in ${remainingMinutes} minute(s).`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      user.loginAttempts += 1;

      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 5 * 60 * 1000);

        await user.save();

        return res.status(403).json({
          message: "Too many failed attempts. Account locked for 5 minutes.",
        });
      }

      await user.save();

      return res.status(400).json({
        message: `Invalid email or password. Attempt ${user.loginAttempts}/5`,
      });
    }

    const userAgent = req.headers["user-agent"] || "";
    const ipAddress = getClientIp(req);
    const device = getDeviceName(userAgent);
    const browser = getBrowserName(userAgent);

    user.loginAttempts = 0;
    user.lockUntil = null;
    user.sessionVersion += 1;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    user.lastLoginDevice = `${device} - ${browser}`;

    user.loginHistory.unshift({
      ipAddress,
      userAgent,
      device,
      browser,
      sessionVersion: user.sessionVersion,
      loggedInAt: new Date(),
    });

    user.loginHistory = user.loginHistory.slice(0, 10);

    await user.save();

    if (user.role === "faculty" && !user.isApproved) {
      return res.status(403).json({
        message: "Faculty approval pending. Contact admin.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        sessionVersion: user.sessionVersion,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    await auditLogger({
      user: user._id,
      action: "LOGIN",
      details: `${user.role} logged in`,
      targetId: user._id,
      req,
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        stream: user.stream,
        classSemester: user.classSemester,
        majorSubjects: user.majorSubjects,
        minorSubjects: user.minorSubjects,
        commonSubjects: user.commonSubjects,
        electiveSubjects: user.electiveSubjects,
        selectedSubjects: user.selectedSubjects,
        subjectSelectionCompleted: user.subjectSelectionCompleted,
        isApproved: user.isApproved,
        isEmailVerified: user.isEmailVerified,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});
router.put(
  "/select-subjects",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "student") {
        return res.status(403).json({
          message:
            "Only students can select subjects",
        });
      }

      const {
        majorSubjects,
        minorSubjects,
        commonSubjects,
        electiveSubjects,
      } = req.body;

      const user = await User.findById(
        req.user.id
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const normalizeArray = (arr) =>
        Array.isArray(arr)
          ? arr
              .map((item) =>
                String(item).trim()
              )
              .filter(Boolean)
          : [];

      const cleanMajorSubjects =
        normalizeArray(
          majorSubjects
        );

      const cleanMinorSubjects =
        normalizeArray(
          minorSubjects
        );

      const cleanCommonSubjects =
        normalizeArray(
          commonSubjects
        );

      const cleanElectiveSubjects =
        normalizeArray(
          electiveSubjects
        );

      const allSubjects = [
        ...cleanMajorSubjects,
        ...cleanMinorSubjects,
        ...cleanCommonSubjects,
        ...cleanElectiveSubjects,
      ];

      if (allSubjects.length === 0) {
        return res.status(400).json({
          message:
            "At least one subject required",
        });
      }

      const uniqueSubjects = [
        ...new Set(allSubjects),
      ];

      const validSubjects =
        await Subject.find({
          name: {
            $in: uniqueSubjects,
          },

          active: true,
        })
          .populate("stream", "name")
          .populate(
            "classSemester",
            "name"
          )
          .populate(
            "allowedDepartments",
            "name"
          );

      const filteredSubjects =
        validSubjects.filter(
          (subject) =>
            subject.stream?.name ===
              user.stream &&
            subject.classSemester
              ?.name ===
              user.classSemester
        );

      if (
        filteredSubjects.length !==
        uniqueSubjects.length
      ) {
        return res.status(400).json({
          message:
            "Invalid subjects selected",
        });
      }

      for (const subject of filteredSubjects) {
        if (
          subject.departmentMode ===
            "single" ||
          subject.departmentMode ===
            "multiple"
        ) {
          const allowed =
            subject.allowedDepartments.some(
              (dept) =>
                dept.name ===
                user.department
            );

          if (!allowed) {
            return res.status(403).json({
              message: `Department not allowed for ${subject.name}`,
            });
          }
        }
      }

      const subjectMap = {};

      filteredSubjects.forEach(
        (subject) => {
          subjectMap[subject.name] =
            subject.courseCategory;
        }
      );

      for (const subject of cleanMajorSubjects) {
        if (
          subjectMap[subject] !==
          "major"
        ) {
          return res.status(400).json({
            message: `${subject} is not a major subject`,
          });
        }
      }

      for (const subject of cleanMinorSubjects) {
        if (
          subjectMap[subject] !==
          "minor"
        ) {
          return res.status(400).json({
            message: `${subject} is not a minor subject`,
          });
        }
      }

      const allowedCommonCategories =
        [
          "common",
          "aec",
          "sec",
          "vac",
          "mdc",
        ];

      for (const subject of cleanCommonSubjects) {
        if (
          !allowedCommonCategories.includes(
            subjectMap[subject]
          )
        ) {
          return res.status(400).json({
            message: `${subject} is not a valid common subject`,
          });
        }
      }

      for (const subject of cleanElectiveSubjects) {
        if (
          subjectMap[subject] !==
          "elective"
        ) {
          return res.status(400).json({
            message: `${subject} is not an elective subject`,
          });
        }
      }

      const mergedSubjects = [
        ...new Set([
          ...cleanMajorSubjects,
          ...cleanMinorSubjects,
          ...cleanCommonSubjects,
          ...cleanElectiveSubjects,
        ]),
      ];

      user.majorSubjects =
        cleanMajorSubjects;

      user.minorSubjects =
        cleanMinorSubjects;

      user.commonSubjects =
        cleanCommonSubjects;

      user.electiveSubjects =
        cleanElectiveSubjects;

      user.selectedSubjects =
        mergedSubjects;

      user.subjectSelectionCompleted = true;

      await user.save();

      await auditLogger({
        user: user._id,
        action:
          "SUBJECT_SELECTION_COMPLETED",
        details:
          "Student completed subject onboarding",
        targetId: user._id,
        req,
      });

      res.json({
        message:
          "Subjects selected successfully",

        user: {
          majorSubjects:
            user.majorSubjects,

          minorSubjects:
            user.minorSubjects,

          commonSubjects:
            user.commonSubjects,

          electiveSubjects:
            user.electiveSubjects,

          selectedSubjects:
            user.selectedSubjects,

          subjectSelectionCompleted:
            user.subjectSelectionCompleted,
        },
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);
module.exports = router;