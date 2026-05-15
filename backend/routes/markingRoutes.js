const express = require("express");
const Submission = require("../models/Submission");
const Exam = require("../models/Exam");
const auditLogger = require("../utils/auditLogger");
const User = require("../models/User");

const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

const canMarkSubmission = (submission, user) => {
  if (user.role === "admin") return true;

  if (!submission.exam) return false;

  if (submission.exam.createdRole === "admin") {
    return (
      submission.assignedEvaluator?.toString() === user.id ||
      submission.exam.assignedEvaluators?.some(
        (id) => id.toString() === user.id
      )
    );
  }

  return submission.exam.createdBy?.toString() === user.id;
};
router.get(
  "/admin-result-workflow",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const submissions = await Submission.find({
        status: "submitted",
      })
        .populate(
          "student",
          "name email stream classSemester"
        )
        .populate(
          "exam",
          "title subject totalMarks createdRole"
        )
        .populate(
          "evaluatedBy",
          "name"
        )
        .populate(
          "approvedBy",
          "name"
        )
        .populate(
          "signedBy",
          "name"
        )
        .sort({
          submittedAt: -1,
        });

      res.json(submissions);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);
router.get(
  "/assigned-papers",
  authMiddleware,
  roleMiddleware("faculty"),
  async (req, res) => {
    try {
      const submissions = await Submission.find({
        assignedEvaluator: req.user.id,
        status: "submitted",
      })
        .populate("exam", "title subject totalMarks createdRole endTime")
        .select(
          "paperId exam answers score evaluated evaluatedAt submittedAt status resultStatus resultLocked"
        )
        .sort({ submittedAt: -1 });

      res.json(submissions);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.get(
  "/paper/:id",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  async (req, res) => {
    try {
      const submission = await Submission.findById(req.params.id)
        .populate("exam")
        .populate("assignedEvaluator", "name email");

      if (!submission) {
        return res.status(404).json({
          message: "Submission not found",
        });
      }

      if (!canMarkSubmission(submission, req.user)) {
        return res.status(403).json({
          message: "You are not assigned to evaluate this paper",
        });
      }

      const data = submission.toObject();

      if (
        req.user.role === "faculty" &&
        data.exam?.createdRole === "admin" &&
        data.exam?.anonymousMarking
      ) {
        delete data.student;
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.put(
  "/score/:id",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  async (req, res) => {
    try {
      const { answers } = req.body;

      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({
          message: "Answers marks are required",
        });
      }

      const submission = await Submission.findById(req.params.id)
        .populate("exam")
        .populate("student", "name email")
        .populate("assignedEvaluator", "name email");

      if (!submission) {
        return res.status(404).json({
          message: "Submission not found",
        });
      }

      if (!submission.exam) {
        return res.status(404).json({
          message: "Exam data not found",
        });
      }

      if (submission.resultLocked) {
        return res.status(403).json({
          message: "Result is locked and cannot be modified",
        });
      }

      if (!canMarkSubmission(submission, req.user)) {
        return res.status(403).json({
          message: "You are not assigned to evaluate this paper",
        });
      }

      if (submission.status !== "submitted") {
        return res.status(400).json({
          message: "Only submitted exams can be marked",
        });
      }

      let totalScore = 0;

      submission.answers = submission.answers.map((answer) => {
        const question = submission.exam.questions[answer.questionIndex];

        if (!question) {
          return answer;
        }

        if (question.type === "mcq") {
          totalScore += Number(answer.obtainedMarks || 0);

          return {
            ...answer.toObject(),
            isChecked: true,
          };
        }

        const markedAnswer = answers.find(
          (item) => Number(item.questionIndex) === Number(answer.questionIndex)
        );

        let obtainedMarks = Number(markedAnswer?.obtainedMarks || 0);

        if (Number.isNaN(obtainedMarks)) {
          obtainedMarks = 0;
        }

        if (obtainedMarks > Number(question.marks || 0)) {
          obtainedMarks = Number(question.marks || 0);
        }

        if (obtainedMarks < 0) {
          obtainedMarks = 0;
        }

        totalScore += obtainedMarks;

        return {
          ...answer.toObject(),
          obtainedMarks,
          isChecked: true,
        };
      });

      submission.score = totalScore;
      submission.evaluated = true;
      submission.evaluatedBy = req.user.id;
      submission.evaluatedAt = new Date();
      submission.resultStatus = "evaluated";

      await submission.save();

      await auditLogger({
        user: req.user.id,
        action: "MARK_SUBMISSION",
        details:
          submission.exam.createdRole === "admin" &&
          submission.exam.anonymousMarking
            ? `Marked anonymous paper ${submission.paperId}`
            : `Marked ${submission.student?.name || "student"} for ${
                submission.exam?.title || "exam"
              }`,
        targetId: submission._id,
        req,
      });

      const responseData = submission.toObject();

      if (
        req.user.role === "faculty" &&
        responseData.exam?.createdRole === "admin" &&
        responseData.exam?.anonymousMarking
      ) {
        delete responseData.student;
      }

      res.json({
        message: "Marks updated successfully",
        score: totalScore,
        submission: responseData,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.put(
  "/assign-evaluators/:examId",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { evaluatorIds } = req.body;

      if (!Array.isArray(evaluatorIds) || evaluatorIds.length === 0) {
        return res.status(400).json({
          message: "At least one evaluator is required",
        });
      }

      const exam = await Exam.findById(req.params.examId);

      if (!exam) {
        return res.status(404).json({
          message: "Exam not found",
        });
      }

      if (exam.createdRole !== "admin") {
        return res.status(400).json({
          message: "Evaluator assignment is only for admin-created exams",
        });
      }

      if (new Date() >= new Date(exam.startTime)) {
        return res.status(403).json({
          message: "Exam already started. Evaluators cannot be changed.",
        });
      }

      const validEvaluators = await User.find({
        _id: {
          $in: evaluatorIds,
        },
        role: "faculty",
        department: exam.department,
        isApproved: true,
        isBlocked: false,
      }).select("_id");

      if (validEvaluators.length !== evaluatorIds.length) {
        return res.status(400).json({
          message:
            "Only approved faculty from the same department can be assigned",
        });
      }

      exam.assignedEvaluators = validEvaluators.map((faculty) => faculty._id);
      exam.anonymousMarking = true;

      await exam.save();

      await auditLogger({
        user: req.user.id,
        action: "ASSIGN_EVALUATORS",
        details: `Assigned evaluators for admin exam: ${exam.title}`,
        targetId: exam._id,
        req,
      });

      res.json({
        message: "Evaluators assigned successfully",
        exam,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.put(
  "/approve-result/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const submission = await Submission.findById(req.params.id).populate(
        "exam"
      );

      if (!submission) {
        return res.status(404).json({
          message: "Submission not found",
        });
      }

      if (!submission.evaluated) {
        return res.status(400).json({
          message: "Only evaluated results can be approved",
        });
      }

      if (submission.resultLocked) {
        return res.status(403).json({
          message: "Result is locked",
        });
      }

      submission.adminApproved = true;
      submission.approvedBy = req.user.id;
      submission.approvedAt = new Date();
      submission.resultStatus = "approved";

      await submission.save();

      await auditLogger({
        user: req.user.id,
        action: "APPROVE_RESULT",
        details: `Approved result for paper ${submission.paperId || submission._id}`,
        targetId: submission._id,
        req,
      });

      res.json({
        message: "Result approved successfully",
        submission,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.put(
  "/sign-result/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const submission = await Submission.findById(req.params.id).populate(
        "exam"
      );

      if (!submission) {
        return res.status(404).json({
          message: "Submission not found",
        });
      }

      if (!submission.adminApproved) {
        return res.status(400).json({
          message: "Approve result before signing",
        });
      }

      if (submission.resultLocked) {
        return res.status(403).json({
          message: "Result is locked",
        });
      }

      submission.digitallySigned = true;
      submission.signedBy = req.user.id;
      submission.signedAt = new Date();
      submission.resultStatus = "signed";

      await submission.save();

      await auditLogger({
        user: req.user.id,
        action: "SIGN_RESULT",
        details: `Digitally signed result for paper ${
          submission.paperId || submission._id
        }`,
        targetId: submission._id,
        req,
      });

      res.json({
        message: "Result digitally signed successfully",
        submission,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.put(
  "/publish-result/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const submission = await Submission.findById(req.params.id).populate(
        "exam"
      );

      if (!submission) {
        return res.status(404).json({
          message: "Submission not found",
        });
      }

      if (!submission.digitallySigned) {
        return res.status(400).json({
          message: "Digitally sign result before publishing",
        });
      }

      submission.resultPublished = true;
      submission.publishedAt = new Date();
      submission.resultStatus = "published";
      submission.resultLocked = true;

      await submission.save();

      await auditLogger({
        user: req.user.id,
        action: "PUBLISH_RESULT",
        details: `Published result for paper ${submission.paperId || submission._id}`,
        targetId: submission._id,
        req,
      });

      res.json({
        message: "Result published successfully",
        submission,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

module.exports = router;