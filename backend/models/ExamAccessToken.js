const mongoose = require("mongoose");

const examAccessTokenSchema = new mongoose.Schema(
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

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    tokenHash: {
      type: String,
      required: true,
    },

    used: {
      type: Boolean,
      default: false,
    },

    usedAt: {
      type: Date,
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

examAccessTokenSchema.index(
  { exam: 1, student: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "ExamAccessToken",
  examAccessTokenSchema
);
