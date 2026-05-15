const mongoose = require("mongoose");

const proctorLogSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: [
        "snapshot",
        "tab-switch",
        "fullscreen-exit",
        "back-navigation",
        "page-refresh",
        "keyboard-shortcut",
        "developer-tools",
        "inactivity",
        "auto-submit",
      ],
      default: "snapshot",
    },

    message: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    imagePath: {
      type: String,
      default: "",
    },

    capturedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

proctorLogSchema.index({
  exam: 1,
  student: 1,
  type: 1,
});

module.exports = mongoose.model(
  "ProctorLog",
  proctorLogSchema
);
