const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    stream: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stream",
      required: true,
    },

    classSemester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSemester",
      required: true,
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
      required: true,
    },

    departmentMode: {
      type: String,
      enum: ["none", "single", "multiple", "all"],
      required: true,
      default: "none",
    },

    allowedDepartments: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Department",
        },
      ],
      default: [],
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

subjectSchema.index(
  {
    code: 1,
    stream: 1,
    classSemester: 1,
  },
  { unique: true }
);

subjectSchema.index({
  stream: 1,
  classSemester: 1,
  courseCategory: 1,
  departmentMode: 1,
});

module.exports = mongoose.model("Subject", subjectSchema);