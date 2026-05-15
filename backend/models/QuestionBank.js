const mongoose = require("mongoose");

const questionBankSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
    },

    stream: {
      type: String,
      required: true,
      trim: true,
    },

    classSemester: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["mcq", "short", "long"],
      required: true,
    },

    questionText: {
      type: String,
      required: true,
      trim: true,
    },

    options: [String],

    correctAnswer: {
      type: String,
      default: "",
    },

    marks: {
      type: Number,
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

questionBankSchema.index({
  subject: 1,
  stream: 1,
  classSemester: 1,
  type: 1,
});

module.exports = mongoose.model("QuestionBank", questionBankSchema);