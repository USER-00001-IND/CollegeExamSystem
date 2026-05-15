const crypto = require("crypto");

const Submission = require("../models/Submission");
const Exam = require("../models/Exam");
const User = require("../models/User");
const ExamAccessToken = require("../models/ExamAccessToken");
const auditLogger = require("../utils/auditLogger");

const validateStudentExamAccess = async (
  studentId,
  examData,
  { requireVerifiedToken = false } = {}
) => {
  const studentData = await User.findById(studentId);

  if (!studentData) {
    return {
      allowed: false,
      message: "Student not found",
    };
  }

  if (
    studentData.role !== "student" ||
    studentData.stream !== examData.stream ||
    studentData.classSemester !== examData.classSemester
  ) {
    return {
      allowed: false,
      message: "You are not allowed to access this exam",
    };
  }

  if (
    !studentData.selectedSubjects?.some(
      (subject) => subject === examData.subject
    )
  ) {
    return {
      allowed: false,
      message: "This exam subject is not in your selected subjects",
    };
  }

  if (examData.createdRole === "admin") {
    const accessToken = await ExamAccessToken.findOne({
      exam: examData._id,
      student: studentId,
      email: studentData.email,
    });

    if (!accessToken) {
      return {
        allowed: false,
        message: "No exam token was issued for this student",
      };
    }

    if (new Date(accessToken.expiresAt) < new Date()) {
      return {
        allowed: false,
        message: "Exam token expired",
      };
    }

    if (requireVerifiedToken && !accessToken.verifiedAt) {
      return {
        allowed: false,
        message: "Verify your exam token before starting this exam",
      };
    }
  }

  return {
    allowed: true,
  };
};

const canViewExamActivity = (exam, user) => {
  if (user.role === "admin") return true;

  if (user.role === "faculty") {
    return (
      exam &&
      exam.department === user.department &&
      exam.departmentVisibility === true
    );
  }

  return false;
};

const getRemainingSeconds = (submission, examData) => {
  if (!submission?.examStartedAt || !examData?.duration) {
    return examData?.duration ? examData.duration * 60 : 0;
  }

  const elapsedSeconds = Math.floor(
    (Date.now() - new Date(submission.examStartedAt).getTime()) / 1000
  );

  return Math.max(examData.duration * 60 - elapsedSeconds, 0);
};

const cleanAnswers = (answers, examData) => {
  const cleaned = [];

  for (const ans of answers) {
    const questionIndex = Number(ans.questionIndex);

    if (
      Number.isNaN(questionIndex) ||
      questionIndex < 0 ||
      questionIndex >= examData.questions.length
    ) {
      continue;
    }

    cleaned[questionIndex] = {
      questionIndex,
      answer: String(ans.answer || ""),
      markedForReview: Boolean(ans.markedForReview),
      obtainedMarks: 0,
      isChecked: false,
    };
  }

  return cleaned.filter(Boolean);
};

const evaluateAnswers = (answers, examData) => {
  let score = 0;

  const evaluatedAnswers = cleanAnswers(answers, examData).map((ans) => {
    const question = examData.questions[ans.questionIndex];

    let obtainedMarks = 0;
    let isChecked = false;

    if (question?.type === "mcq") {
      isChecked = true;

      const studentAnswer = String(ans.answer || "").trim().toLowerCase();
      const correctAnswer = String(question.correctAnswer || "")
        .trim()
        .toLowerCase();

      if (studentAnswer && studentAnswer === correctAnswer) {
        obtainedMarks = Number(question.marks || 0);
        score += obtainedMarks;
      }
    }

    return {
      questionIndex: ans.questionIndex,
      answer: ans.answer,
      markedForReview: ans.markedForReview,
      obtainedMarks,
      isChecked,
    };
  });

  return {
    evaluatedAnswers,
    score,
  };
};

const generatePaperId = () => {
  return `PAPER-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

const getAssignedEvaluator = (examData, studentId) => {
  const evaluators = examData.assignedEvaluators || [];

  if (!evaluators.length) {
    return null;
  }

  const seed = String(studentId)
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0);

  return evaluators[seed % evaluators.length];
};

const submitExam = async (req, res) => {
  try {
    const { exam, answers } = req.body;
    const student = req.user.id;

    if (!exam || !Array.isArray(answers)) {
      return res.status(400).json({
        message: "Exam and answers are required",
      });
    }

    const examData = await Exam.findById(exam);

    if (!examData) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const access = await validateStudentExamAccess(student, examData, {
      requireVerifiedToken: true,
    });

    if (!access.allowed) {
      return res.status(403).json({
        message: access.message,
      });
    }

    const now = new Date();

    if (!examData.isPublished) {
      return res.status(403).json({
        message: "Exam is not published",
      });
    }

    if (now < new Date(examData.startTime)) {
      return res.status(403).json({
        message: "Exam has not started yet",
      });
    }

    const alreadySubmitted = await Submission.findOne({
      exam,
      student,
      status: "submitted",
    });

    if (alreadySubmitted) {
      return res.status(200).json({
        message: "Exam already submitted",
        submitted: true,
      });
    }

    const existingProgress = await Submission.findOne({
      exam,
      student,
      status: "in-progress",
    });

    if (existingProgress) {
      const remainingSeconds = getRemainingSeconds(existingProgress, examData);

      if (remainingSeconds <= 0) {
        return res.status(403).json({
          message: "Exam time is over",
        });
      }
    }

    const { evaluatedAnswers, score } = evaluateAnswers(answers, examData);

    const hasManualQuestions = examData.questions.some(
      (q) => q.type === "short" || q.type === "long"
    );

    const assignedEvaluator =
      examData.createdRole === "admin"
        ? getAssignedEvaluator(examData, student)
        : null;

    const paperId =
      examData.createdRole === "admin" ? generatePaperId() : undefined;

    let submission = existingProgress;

    if (submission) {
      submission.answers = evaluatedAnswers;
      submission.score = score;
      submission.status = "submitted";
      submission.submittedAt = new Date();
      submission.lastSavedAt = new Date();
      submission.evaluated = !hasManualQuestions;

      if (examData.createdRole === "admin" && !submission.paperId) {
        submission.paperId = paperId;
      }

      if (examData.createdRole === "admin" && assignedEvaluator) {
        submission.assignedEvaluator = assignedEvaluator;
      }

      await submission.save();
    } else {
      submission = await Submission.create({
        exam,
        student,
        paperId,
        assignedEvaluator,
        answers: evaluatedAnswers,
        score,
        status: "submitted",
        submittedAt: new Date(),
        lastSavedAt: new Date(),
        examStartedAt: new Date(),
        evaluated: !hasManualQuestions,
      });
    }

    if (examData.createdRole === "admin") {
      await ExamAccessToken.findOneAndUpdate(
        {
          exam,
          student,
        },
        {
          used: true,
          usedAt: new Date(),
        }
      );
    }

    await auditLogger({
      user: student,
      action: "SUBMIT_EXAM",
      details: `Student submitted exam: ${examData.title}`,
      targetId: submission._id,
      req,
    });

    res.status(201).json({
      message: "Exam submitted successfully",
      submission,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getSubmissions = async (req, res) => {
  try {
    let submissions = await Submission.find({
      status: "submitted",
    })
      .populate("exam")
      .populate("student", "-password")
      .populate("evaluatedBy", "name email")
      .sort({ createdAt: -1 });

    if (req.user.role === "faculty") {
      submissions = submissions.filter((item) =>
        canViewExamActivity(item.exam, req.user)
      );
    }

    res.json(submissions);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({
      student: req.user.id,
      status: "submitted",
    })
      .populate({
        path: "exam",
        select: "title subject totalMarks startTime endTime",
      })
      .select("exam student submittedAt evaluated status")
      .sort({ createdAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const checkSubmission = async (req, res) => {
  try {
    const { exam } = req.query;
    const student = req.user.id;

    if (!exam) {
      return res.status(400).json({
        message: "Exam is required",
      });
    }

    const examData = await Exam.findById(exam);

    if (!examData) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const access = await validateStudentExamAccess(student, examData);

    if (!access.allowed) {
      return res.status(403).json({
        message: access.message,
      });
    }

    const submission = await Submission.findOne({
      exam,
      student,
      status: "submitted",
    });

    res.json({
      submitted: !!submission,
      evaluated: submission?.evaluated || false,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const saveProgress = async (req, res) => {
  try {
    const { exam, answers } = req.body;
    const student = req.user.id;

    if (!exam || !Array.isArray(answers)) {
      return res.status(400).json({
        message: "Exam and answers are required",
      });
    }

    const examData = await Exam.findById(exam);

    if (!examData) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const access = await validateStudentExamAccess(student, examData, {
      requireVerifiedToken: true,
    });

    if (!access.allowed) {
      return res.status(403).json({
        message: access.message,
      });
    }

    if (!examData.isPublished) {
      return res.status(403).json({
        message: "Exam is not published",
      });
    }

    const now = new Date();

    if (now < new Date(examData.startTime)) {
      return res.status(403).json({
        message: "Exam has not started yet",
      });
    }

    if (now > new Date(examData.endTime)) {
      return res.status(403).json({
        message: "Exam time is over",
      });
    }

    const submitted = await Submission.findOne({
      exam,
      student,
      status: "submitted",
    });

    if (submitted) {
      return res.json({
        message: "Exam already submitted",
        submitted: true,
      });
    }

    let submission = await Submission.findOne({
      exam,
      student,
      status: "in-progress",
    });

    if (submission) {
      const remainingSeconds = getRemainingSeconds(submission, examData);

      if (remainingSeconds <= 0) {
        return res.status(403).json({
          message: "Exam time is over",
          remainingSeconds: 0,
        });
      }
    }

    const cleanedAnswers = cleanAnswers(answers, examData);

    submission = await Submission.findOneAndUpdate(
      {
        exam,
        student,
        status: "in-progress",
      },
      {
        $set: {
          exam,
          student,
          answers: cleanedAnswers,
          status: "in-progress",
          lastSavedAt: new Date(),
        },

        $setOnInsert: {
          examStartedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    res.json({
      message: "Progress saved",
      lastSavedAt: submission.lastSavedAt,
      examStartedAt: submission.examStartedAt,
      remainingSeconds: getRemainingSeconds(submission, examData),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getProgress = async (req, res) => {
  try {
    const { exam } = req.query;
    const student = req.user.id;

    if (!exam) {
      return res.status(400).json({
        message: "Exam is required",
      });
    }

    const examData = await Exam.findById(exam);

    if (!examData) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const access = await validateStudentExamAccess(student, examData, {
      requireVerifiedToken: true,
    });

    if (!access.allowed) {
      return res.status(403).json({
        message: access.message,
      });
    }

    const submitted = await Submission.findOne({
      exam,
      student,
      status: "submitted",
    });

    if (submitted) {
      return res.json({
        found: true,
        submitted: true,
        answers: submitted.answers || [],
        lastSavedAt: submitted.lastSavedAt || null,
        examStartedAt: submitted.examStartedAt || null,
        remainingSeconds: 0,
      });
    }

    if (new Date() > new Date(examData.endTime)) {
      return res.json({
        found: false,
        submitted: false,
        answers: [],
        lastSavedAt: null,
        examStartedAt: null,
        remainingSeconds: 0,
      });
    }

    let submission = await Submission.findOne({
      exam,
      student,
      status: "in-progress",
    });

    if (!submission) {
      submission = await Submission.create({
        exam,
        student,
        answers: [],
        status: "in-progress",
        lastSavedAt: new Date(),
        examStartedAt: new Date(),
      });
    }

    res.json({
      found: true,
      submitted: false,
      answers: submission.answers || [],
      lastSavedAt: submission.lastSavedAt || null,
      examStartedAt: submission.examStartedAt || null,
      remainingSeconds: getRemainingSeconds(submission, examData),
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getStudentScoreCard = async (req, res) => {
  try {
    const { subject, examId } = req.query;
    const student = req.user.id;

    if (!subject || !examId) {
      return res.status(400).json({
        message: "Subject and exam are required",
      });
    }

    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const access = await validateStudentExamAccess(student, exam);

    if (!access.allowed) {
      return res.status(403).json({
        message: access.message,
      });
    }

    const submission = await Submission.findOne({
      exam: examId,
      student,
      status: "submitted",
    })
      .populate("exam")
      .populate("student", "-password")
      .populate("evaluatedBy", "name email");

    if (!submission) {
      return res.json({
        absent: true,
        subject,
        exam,
        score: 0,
        totalMarks: exam.totalMarks,
        status: "Absent",
      });
    }
    if (!submission.resultPublished) {
    return res.json({
      absent: false,
      underEvaluation: true,
      message:
        "Official result has not been published yet.",
    });
  }
    if (!submission.evaluated) {
      return res.json({
        absent: false,
        underEvaluation: true,
        message: "Your submission is currently under evaluation by faculty.",
        submission: {
          _id: submission._id,
          exam: {
            _id: submission.exam?._id,
            title: submission.exam?.title,
            subject: submission.exam?.subject,
          },
          submittedAt: submission.submittedAt,
        },
      });
    }

    const percentage = exam.totalMarks
      ? (submission.score / exam.totalMarks) * 100
      : 0;

    res.json({
      absent: false,
      underEvaluation: false,
      submission,
      score: submission.score,
      totalMarks: exam.totalMarks,
      status: percentage >= 40 ? "Pass" : "Fail",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getFacultyClassResults = async (req, res) => {
  try {
    const { classSemester, examId } = req.query;

    if (!classSemester || !examId) {
      return res.status(400).json({
        message: "Class and exam are required",
      });
    }

    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    if (req.user.role === "faculty" && !canViewExamActivity(exam, req.user)) {
      return res.status(403).json({
        message: "You can view only same department exam results",
      });
    }

    const students = await User.find({
      role: "student",
      classSemester,
      stream: exam.stream,
    }).select("-password");

    const resultData = [];

    for (const studentData of students) {
      const submission = await Submission.findOne({
        exam: examId,
        student: studentData._id,
        status: "submitted",
      });

      if (submission) {
        resultData.push({
          _id: submission._id,
          studentName: studentData.name,
          email: studentData.email,
          classSemester: studentData.classSemester,
          stream: studentData.stream,
          examTitle: exam.title,
          subject: exam.subject,
          score: submission.evaluated ? submission.score : null,
          totalMarks: exam.totalMarks,
          submittedAt: submission.submittedAt,
          status: submission.evaluated ? "Evaluated" : "Pending Evaluation",
        });
      } else {
        resultData.push({
          _id: studentData._id,
          studentName: studentData.name,
          email: studentData.email,
          classSemester: studentData.classSemester,
          stream: studentData.stream,
          examTitle: exam.title,
          subject: exam.subject,
          score: 0,
          totalMarks: exam.totalMarks,
          submittedAt: null,
          status: "Absent",
        });
      }
    }

    res.json(resultData);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  submitExam,
  getSubmissions,
  getMySubmissions,
  checkSubmission,
  saveProgress,
  getProgress,
  getStudentScoreCard,
  getFacultyClassResults,
};
