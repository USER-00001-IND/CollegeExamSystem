const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  questionIndex: Number,

  answer: String,

  markedForReview: {
    type: Boolean,
    default: false,
  },

  obtainedMarks: {
    type: Number,
    default: 0,
  },

  isChecked: {
    type: Boolean,
    default: false,
  },
});

const submissionSchema = new mongoose.Schema(
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

    paperId: {
      type: String,
      unique: true,
      sparse: true,
    },

    assignedEvaluator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    answers: [answerSchema],

    score: {
      type: Number,
      default: 0,
    },

    evaluated: {
      type: Boolean,
      default: false,
    },

    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    evaluatedAt: {
      type: Date,
      default: null,
    },

    resultStatus: {
      type: String,
      enum: [
        "pending-evaluation",
        "evaluated",
        "approved",
        "signed",
        "published",
      ],
      default: "pending-evaluation",
    },

    adminApproved: {
      type: Boolean,
      default: false,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    digitallySigned: {
      type: Boolean,
      default: false,
    },

    signedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    signedAt: {
      type: Date,
      default: null,
    },

    resultPublished: {
      type: Boolean,
      default: false,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    resultLocked: {
      type: Boolean,
      default: false,
    },

    examStartedAt: {
      type: Date,
      default: null,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
    },

    lastSavedAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["in-progress", "submitted"],
      default: "in-progress",
    },
  },
  { timestamps: true }
);

submissionSchema.index(
  { exam: 1, student: 1, status: 1 },
  { unique: true }
);

submissionSchema.index({
  assignedEvaluator: 1,
  status: 1,
});


module.exports = mongoose.model("Submission", submissionSchema);