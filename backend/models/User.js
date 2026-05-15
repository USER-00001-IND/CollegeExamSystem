const mongoose = require("mongoose");

const loginDeviceSchema = new mongoose.Schema(
  {
    ipAddress: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },

    device: {
      type: String,
      default: "Unknown Device",
    },

    browser: {
      type: String,
      default: "Unknown Browser",
    },

    sessionVersion: {
      type: Number,
      default: 0,
    },

    loggedInAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["student", "faculty", "admin"],
      required: true,
    },

    department: {
      type: String,
      trim: true,
      default: "",
    },

    stream: {
      type: String,
      trim: true,
      default: "",
    },

    classSemester: {
      type: String,
      trim: true,
      default: "",
    },

    majorSubjects: {
      type: [String],
      default: [],
    },

    minorSubjects: {
      type: [String],
      default: [],
    },

    commonSubjects: {
      type: [String],
      default: [],
    },

    electiveSubjects: {
      type: [String],
      default: [],
    },

    selectedSubjects: {
      type: [String],
      default: [],
    },

    subjectSelectionCompleted: {
      type: Boolean,
      default: false,
    },

    isApproved: {
      type: Boolean,
      default: false,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    sessionVersion: {
      type: Number,
      default: 0,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginIp: {
      type: String,
      default: "",
    },

    lastLoginDevice: {
      type: String,
      default: "",
    },

    loginHistory: {
      type: [loginDeviceSchema],
      default: [],
    },

    emailOtp: {
      type: String,
    },

    emailOtpExpires: {
      type: Date,
    },

    resetOtp: {
      type: String,
    },

    resetOtpExpires: {
      type: Date,
    },

    loginAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);