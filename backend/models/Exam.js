const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["mcq", "short", "long"],
    required: true,
  },

  questionText: {
    type: String,
    required: true,
  },

  options: [String],

  correctAnswer: String,

  marks: {
    type: Number,
    required: true,
  },
});

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    courseCategory: {
      type: String,
      enum: [
        "major",
        "minor",
        "common",
        "aec",
        "sec",
        "vac",
        "mdc",
        "elective",
      ],
      default: "common",
    },

    targetMode: {
      type: String,
      enum: [
        "single",
        "multi-class",
        "multi-stream",
        "department",
        "all-eligible",
      ],
      default: "single",
    },

    targetStreams: {
      type: [String],
      default: [],
    },

    targetClasses: {
      type: [String],
      default: [],
    },

    targetDepartments: {
      type: [String],
      default: [],
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

    department: {
      type: String,
      trim: true,
      default: "",
    },

    departmentVisibility: {
      type: Boolean,
      default: true,
    },

    createdRole: {
      type: String,
      enum: ["faculty", "admin"],
      required: true,
    },

    allowedEditors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    assignedEvaluators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    anonymousMarking: {
      type: Boolean,
      default: true,
    },

    editingLock: {
      lockedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      lockedAt: {
        type: Date,
        default: null,
      },
    },

    duration: {
      type: Number,
      required: true,
    },

    totalMarks: {
      type: Number,
      required: true,
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      required: true,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    questions: [questionSchema],

    securitySettings: {
      fullscreen: Boolean,
      disableRightClick: Boolean,
      disableCopyPaste: Boolean,
      tabSwitchWarning: Boolean,
      camera: Boolean,
      microphone: Boolean,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

examSchema.index({
  stream: 1,
  classSemester: 1,
  subject: 1,
  isPublished: 1,
});

examSchema.index({
  targetDepartments: 1,
  createdBy: 1,
});

examSchema.index({
  createdRole: 1,
  isPublished: 1,
});

module.exports = mongoose.model("Exam", examSchema);
