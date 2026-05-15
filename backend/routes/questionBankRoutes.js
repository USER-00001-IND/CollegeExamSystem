const express = require("express");
const QuestionBank = require("../models/QuestionBank");
const auditLogger = require("../utils/auditLogger");

const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

const cleanText = (value) => {
  return String(value || "").trim();
};

const validateQuestion = (data) => {
  const {
    subject,
    stream,
    classSemester,
    type,
    questionText,
    options,
    correctAnswer,
    marks,
  } = data;

  if (
    !subject ||
    !stream ||
    !classSemester ||
    !type ||
    !questionText ||
    !marks
  ) {
    return "All required fields must be filled";
  }

  if (!["mcq", "short", "long"].includes(type)) {
    return "Invalid question type";
  }

  if (Number(marks) <= 0) {
    return "Marks must be greater than zero";
  }

  if (type === "mcq") {
    const cleanOptions = Array.isArray(options)
      ? options.map((item) => cleanText(item)).filter(Boolean)
      : [];

    if (cleanOptions.length < 2) {
      return "MCQ must have at least 2 options";
    }

    if (!correctAnswer) {
      return "Correct answer is required for MCQ";
    }

    if (!cleanOptions.includes(cleanText(correctAnswer))) {
      return "Correct answer must match one option";
    }
  }

  return null;
};

router.post(
  "/",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  async (req, res) => {
    try {
      const validationError = validateQuestion(req.body);

      if (validationError) {
        return res.status(400).json({
          message: validationError,
        });
      }

      const {
        subject,
        stream,
        classSemester,
        type,
        questionText,
        options,
        correctAnswer,
        marks,
      } = req.body;

      const cleanOptions =
        type === "mcq"
          ? options.map((item) => cleanText(item)).filter(Boolean)
          : [];

      const question = await QuestionBank.create({
        subject: cleanText(subject),
        stream: cleanText(stream),
        classSemester: cleanText(classSemester),
        type,
        questionText: cleanText(questionText),
        options: cleanOptions,
        correctAnswer: type === "mcq" ? cleanText(correctAnswer) : "",
        marks: Number(marks),
        createdBy: req.user.id,
      });

      await auditLogger({
        user: req.user.id,
        action: "CREATE_QUESTION_BANK",
        details: `Question added to bank: ${question.subject}`,
        targetId: question._id,
        req,
      });

      res.status(201).json({
        message: "Question added successfully",
        question,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  async (req, res) => {
    try {
      const { subject, stream, classSemester, type } = req.query;

      const filter = {};

      if (subject) filter.subject = cleanText(subject);
      if (stream) filter.stream = cleanText(stream);
      if (classSemester) filter.classSemester = cleanText(classSemester);
      if (type) filter.type = cleanText(type);

      if (req.user.role === "faculty") {
        filter.createdBy = req.user.id;
      }

      const questions = await QuestionBank.find(filter)
        .populate("createdBy", "name email role")
        .sort({ createdAt: -1 });

      res.json(questions);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  async (req, res) => {
    try {
      const question = await QuestionBank.findById(req.params.id);

      if (!question) {
        return res.status(404).json({
          message: "Question not found",
        });
      }

      if (
        req.user.role === "faculty" &&
        question.createdBy.toString() !== req.user.id
      ) {
        return res.status(403).json({
          message: "You can update only your own questions",
        });
      }

      const validationError = validateQuestion(req.body);

      if (validationError) {
        return res.status(400).json({
          message: validationError,
        });
      }

      const {
        subject,
        stream,
        classSemester,
        type,
        questionText,
        options,
        correctAnswer,
        marks,
      } = req.body;

      question.subject = cleanText(subject);
      question.stream = cleanText(stream);
      question.classSemester = cleanText(classSemester);
      question.type = type;
      question.questionText = cleanText(questionText);
      question.options =
        type === "mcq"
          ? options.map((item) => cleanText(item)).filter(Boolean)
          : [];
      question.correctAnswer = type === "mcq" ? cleanText(correctAnswer) : "";
      question.marks = Number(marks);

      await question.save();

      await auditLogger({
        user: req.user.id,
        action: "UPDATE_QUESTION_BANK",
        details: "Question updated in bank",
        targetId: question._id,
        req,
      });

      res.json({
        message: "Question updated successfully",
        question,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  async (req, res) => {
    try {
      const question = await QuestionBank.findById(req.params.id);

      if (!question) {
        return res.status(404).json({
          message: "Question not found",
        });
      }

      if (
        req.user.role === "faculty" &&
        question.createdBy.toString() !== req.user.id
      ) {
        return res.status(403).json({
          message: "You can delete only your own questions",
        });
      }

      await question.deleteOne();

      await auditLogger({
        user: req.user.id,
        action: "DELETE_QUESTION_BANK",
        details: "Question deleted from bank",
        targetId: question._id,
        req,
      });

      res.json({
        message: "Question deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

module.exports = router;