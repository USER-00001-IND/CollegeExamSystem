const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const Exam = require("../models/Exam");
const User = require("../models/User");
const ExamAccessToken = require("../models/ExamAccessToken");
const Subject = require("../models/Subject");

const auditLogger = require("../utils/auditLogger");
const sendEmail = require("../utils/sendEmail");

const LOCK_TIMEOUT = 5 * 60 * 1000;

const escapeRegex = (text) => {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const generateExamToken = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

const calculateTotalMarks = (questions = []) => {
  return questions.reduce((total, question) => {
    return total + Number(question.marks || 0);
  }, 0);
};

const validateQuestions = (questions) => {
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return "At least one question is required";
  }

  for (const question of questions) {
    if (!question.type || !question.questionText || !question.marks) {
      return "Each question must have type, question text and marks";
    }

    if (Number(question.marks) <= 0) {
      return "Question marks must be greater than zero";
    }

    if (question.type === "mcq") {
      const validOptions = (question.options || []).filter((opt) =>
        String(opt || "").trim()
      );

      if (validOptions.length < 2) {
        return "Each MCQ must have at least two options";
      }

      if (!question.correctAnswer) {
        return "Each MCQ must have a correct answer";
      }

      if (!validOptions.includes(question.correctAnswer)) {
        return "MCQ correct answer must match one option";
      }
    }
  }

  return null;
};

const isOwner = (exam, userId) => {
  return exam.createdBy?.toString() === userId;
};

const isAllowedEditor = (exam, userId) => {
  return (exam.allowedEditors || []).some((id) => id.toString() === userId);
};

const canEditExam = (exam, user) => {
  if (user.role === "admin") return true;

  return isOwner(exam, user.id) || isAllowedEditor(exam, user.id);
};

const isLockExpired = (exam) => {
  if (!exam.editingLock?.lockedAt) return true;

  return (
    Date.now() - new Date(exam.editingLock.lockedAt).getTime() > LOCK_TIMEOUT
  );
};

const validateAcademicCombination = async ({
  subject,
  stream,
  classSemester,
  department,
  user,
}) => {
  const subjectData = await Subject.findOne({
    name: String(subject || "").trim(),
    active: true,
  })
    .populate("stream", "name")
    .populate("classSemester", "name")
    .populate("allowedDepartments", "name");

  if (!subjectData) {
    return {
      valid: false,
      message: "Selected subject is not registered in academics",
    };
  }

  if (
    subjectData.stream?.name !== String(stream || "").trim() ||
    subjectData.classSemester?.name !== String(classSemester || "").trim()
  ) {
    return {
      valid: false,
      message: "Subject does not match selected stream and class",
    };
  }

  const examDepartment =
    user.role === "faculty"
      ? String(user.department || "").trim()
      : String(department || "").trim();

  const mode = subjectData.departmentMode;

  if (["single", "multiple"].includes(mode)) {
    if (!examDepartment) {
      return {
        valid: false,
        message: "Department is required for this subject",
      };
    }

    const allowed = subjectData.allowedDepartments.some(
      (item) => item.name === examDepartment
    );

    if (!allowed) {
      return {
        valid: false,
        message: "Department is not allowed for this subject",
      };
    }
  }

  return {
    valid: true,
    department: examDepartment || "",
  };
};

const generateTokensForAdminExam = async (exam, req) => {
  if (exam.createdRole !== "admin") return;

  const students = await User.find({
    role: "student",
    stream: exam.stream,
    classSemester: exam.classSemester,
    selectedSubjects: {
      $in: [exam.subject],
    },
    subjectSelectionCompleted: true,
    isEmailVerified: true,
    isBlocked: false,
  }).select("name email");

  for (const student of students) {
    const plainToken = generateExamToken();
    const tokenHash = await bcrypt.hash(plainToken, 10);

    await ExamAccessToken.findOneAndUpdate(
      {
        exam: exam._id,
        student: student._id,
      },
      {
        exam: exam._id,
        student: student._id,
        email: student.email,
        tokenHash,
        used: false,
        usedAt: null,
        verifiedAt: null,
        sentAt: new Date(),
        expiresAt: exam.endTime,
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    await sendEmail({
      to: student.email,
      subject: `Exam Access Token - ${exam.title}`,
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>Exam Access Token</h2>
          <p>Hello ${student.name},</p>
          <p>Your access token for the exam is:</p>
          <h1 style="letter-spacing: 4px;">${plainToken}</h1>
          <p><strong>Exam:</strong> ${exam.title}</p>
          <p><strong>Subject:</strong> ${exam.subject}</p>
          <p>This token is valid only for your registered email.</p>
          <p>Do not share this token with anyone.</p>
        </div>
      `,
    });
  }

  await auditLogger({
    user: req.user.id,
    action: "GENERATE_EXAM_TOKENS",
    details: `Generated exam tokens for ${students.length} students: ${exam.title}`,
    targetId: exam._id,
    req,
  });
};

const createExam = async (req, res) => {
  try {
    const {
      title,
      subject,
      department,
      stream,
      classSemester,
      duration,
      startTime,
      endTime,
      questions,
    } = req.body;

    if (
      !title ||
      !subject ||
      !stream ||
      !classSemester ||
      !duration ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        message: "All exam fields are required",
      });
    }

    if (req.user.role === "faculty" && !req.user.department) {
      return res.status(400).json({
        message: "Faculty department is missing",
      });
    }

    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({
        message: "End time must be after start time",
      });
    }

    if (Number(duration) <= 0) {
      return res.status(400).json({
        message: "Duration must be greater than zero",
      });
    }

    const academicValidation = await validateAcademicCombination({
      subject,
      stream,
      classSemester,
      department,
      user: req.user,
    });

    if (!academicValidation.valid) {
      return res.status(400).json({
        message: academicValidation.message,
      });
    }

    const questionError = validateQuestions(questions);

    if (questionError) {
      return res.status(400).json({
        message: questionError,
      });
    }

    const cleanedQuestions = questions.map((question) => ({
      type: question.type,
      questionText: String(question.questionText).trim(),
      options:
        question.type === "mcq"
          ? question.options.filter((opt) => String(opt).trim())
          : [],
      correctAnswer:
        question.type === "mcq" ? String(question.correctAnswer).trim() : "",
      marks: Number(question.marks),
    }));

    const totalMarks = calculateTotalMarks(cleanedQuestions);

    const exam = await Exam.create({
      title: title.trim(),
      subject: subject.trim(),
      stream: stream.trim(),
      classSemester: classSemester.trim(),
      department: academicValidation.department,
      createdRole: req.user.role,
      departmentVisibility: true,
      allowedEditors: [],
      assignedEvaluators: [],
      anonymousMarking: true,
      editingLock: {
        lockedBy: null,
        lockedAt: null,
      },
      duration: Number(duration),
      totalMarks,
      startTime,
      endTime,
      questions: cleanedQuestions,
      securitySettings: req.body.securitySettings || {},
      createdBy: req.user.id,
    });

    await auditLogger({
      user: req.user.id,
      action: "CREATE_EXAM",
      details: `Exam created: ${exam.title}`,
      targetId: exam._id,
      req,
    });

    res.status(201).json({
      message:
        req.user.role === "admin"
          ? "Admin exam created successfully. Publish exam to send student tokens."
          : "Exam created successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getAllExams = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "faculty") {
      query = {
        department: req.user.department,
        departmentVisibility: true,
      };
    }

    const exams = await Exam.find(query)
      .populate("createdBy", "name email department role")
      .populate("allowedEditors", "name email department")
      .populate("assignedEvaluators", "name email department")
      .populate("editingLock.lockedBy", "name email")
      .sort({
        createdAt: -1,
      });

    const formattedExams = exams.map((exam) => {
      const examObj = exam.toObject();

      examObj.isOwner = isOwner(exam, req.user.id);
      examObj.canEdit = canEditExam(exam, req.user);
      examObj.canShare = isOwner(exam, req.user.id);
      examObj.isLocked =
        exam.editingLock?.lockedBy &&
        exam.editingLock.lockedBy._id?.toString() !== req.user.id &&
        !isLockExpired(exam);

      return examObj;
    });

    res.json(formattedExams);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getDepartmentFaculty = async (req, res) => {
  try {
    if (!req.user.department) {
      return res.status(400).json({
        message: "Faculty department is missing",
      });
    }

    const faculty = await User.find({
      role: "faculty",
      department: req.user.department,
      isApproved: true,
      isBlocked: false,
      _id: {
        $ne: req.user.id,
      },
    })
      .select("name email department")
      .sort({
        name: 1,
      });

    res.json(faculty);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getStudentExams = async (req, res) => {
  try {
    const stream = req.user.stream?.trim();
    const classSemester = req.user.classSemester?.trim();

    if (!stream || !classSemester) {
      return res.status(400).json({
        message: "Student stream and class are missing",
        userStream: stream || "",
        userClassSemester: classSemester || "",
      });
    }

    const exams = await Exam.find({
      isPublished: true,
      stream: {
        $regex: `^${escapeRegex(stream)}$`,
        $options: "i",
      },
      classSemester: {
        $regex: `^${escapeRegex(classSemester)}$`,
        $options: "i",
      },
      subject: {
        $in: req.user.selectedSubjects || [],
      },
    })
      .select("-questions.correctAnswer")
      .sort({
        startTime: 1,
      });

    res.json(exams);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const verifyAdminExamToken = async (req, res) => {
  try {
    const { examId, email, token } = req.body;

    if (!examId || !email || !token) {
      return res.status(400).json({
        message: "Exam, email and token are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail !== req.user.email) {
      return res.status(403).json({
        message: "Use your registered email only",
      });
    }

    const exam = await Exam.findById(examId);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    if (exam.createdRole !== "admin") {
      return res.json({
        verified: true,
        message: "Token not required for this exam",
      });
    }

    const accessToken = await ExamAccessToken.findOne({
      exam: examId,
      student: req.user.id,
      email: cleanEmail,
    });

    if (!accessToken) {
      return res.status(403).json({
        message: "No token issued for this exam",
      });
    }

    if (new Date(accessToken.expiresAt) < new Date()) {
      return res.status(403).json({
        message: "Token expired",
      });
    }

    const isTokenValid = await bcrypt.compare(
      token.trim().toUpperCase(),
      accessToken.tokenHash
    );

    if (!isTokenValid) {
      return res.status(403).json({
        message: "Invalid token",
      });
    }

    accessToken.verifiedAt = new Date();

    await accessToken.save();

    await auditLogger({
      user: req.user.id,
      action: "VERIFY_EXAM_TOKEN",
      details: `Student verified token for admin exam: ${exam.title}`,
      targetId: exam._id,
      req,
    });

    res.json({
      verified: true,
      message: "Token verified successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const lockExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).populate(
      "editingLock.lockedBy",
      "name email"
    );

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    if (!canEditExam(exam, req.user)) {
      return res.status(403).json({
        message: "You do not have edit permission for this exam",
      });
    }

    const lockedBy = exam.editingLock?.lockedBy;

    if (
      lockedBy &&
      lockedBy._id.toString() !== req.user.id &&
      !isLockExpired(exam)
    ) {
      return res.status(423).json({
        message: `This exam is currently being edited by ${lockedBy.name}`,
        lockedBy,
      });
    }

    exam.editingLock = {
      lockedBy: req.user.id,
      lockedAt: new Date(),
    };

    await exam.save();

    res.json({
      message: "Exam locked for editing",
      exam,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const unlockExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const lockedBy = exam.editingLock?.lockedBy?.toString();

    if (lockedBy && lockedBy !== req.user.id && !isOwner(exam, req.user.id)) {
      return res.status(403).json({
        message: "You cannot unlock this exam",
      });
    }

    exam.editingLock = {
      lockedBy: null,
      lockedAt: null,
    };

    await exam.save();

    res.json({
      message: "Exam unlocked",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const deleteExam = async (req, res) => {
  try {
    const existingExam = await Exam.findById(req.params.id);

    if (!existingExam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    if (!isOwner(existingExam, req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only exam owner can delete this exam",
      });
    }

    if (existingExam.isPublished) {
      return res.status(403).json({
        message: "Cannot delete published exam",
      });
    }

    if (new Date() >= new Date(existingExam.startTime)) {
      return res.status(403).json({
        message: "Cannot delete exam after it has started",
      });
    }

    await Exam.findByIdAndDelete(req.params.id);

    await ExamAccessToken.deleteMany({
      exam: existingExam._id,
    });

    await auditLogger({
      user: req.user.id,
      action: "DELETE_EXAM",
      details: `Exam deleted: ${existingExam.title}`,
      targetId: existingExam._id,
      req,
    });

    res.json({
      message: "Exam deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const updateExam = async (req, res) => {
  try {
    const existingExam = await Exam.findById(req.params.id);

    if (!existingExam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    if (!canEditExam(existingExam, req.user)) {
      return res.status(403).json({
        message: "You do not have edit permission for this exam",
      });
    }

    const lockedBy = existingExam.editingLock?.lockedBy?.toString();

    if (lockedBy && lockedBy !== req.user.id && !isLockExpired(existingExam)) {
      return res.status(423).json({
        message: "This exam is locked by another faculty",
      });
    }

    if (existingExam.isPublished) {
      return res.status(403).json({
        message: "Cannot modify published exam",
      });
    }

    if (new Date() >= new Date(existingExam.startTime)) {
      return res.status(403).json({
        message: "Cannot edit exam after it has started",
      });
    }

    const { subject, stream, classSemester, department } = req.body;

    const academicValidation = await validateAcademicCombination({
      subject,
      stream,
      classSemester,
      department,
      user: req.user,
    });

    if (!academicValidation.valid) {
      return res.status(400).json({
        message: academicValidation.message,
      });
    }

    const questionError = validateQuestions(req.body.questions);

    if (questionError) {
      return res.status(400).json({
        message: questionError,
      });
    }

    const cleanedQuestions = req.body.questions.map((question) => ({
      type: question.type,
      questionText: String(question.questionText).trim(),
      options:
        question.type === "mcq"
          ? question.options.filter((opt) => String(opt).trim())
          : [],
      correctAnswer:
        question.type === "mcq" ? String(question.correctAnswer).trim() : "",
      marks: Number(question.marks),
    }));

    const totalMarks = calculateTotalMarks(cleanedQuestions);

    existingExam.title = req.body.title?.trim();
    existingExam.subject = subject?.trim();
    existingExam.stream = stream?.trim();
    existingExam.classSemester = classSemester?.trim();
    existingExam.department = academicValidation.department;
    existingExam.duration = Number(req.body.duration);
    existingExam.totalMarks = totalMarks;
    existingExam.startTime = req.body.startTime;
    existingExam.endTime = req.body.endTime;
    existingExam.questions = cleanedQuestions;
    existingExam.securitySettings =
      req.body.securitySettings || existingExam.securitySettings;
    existingExam.editingLock = {
      lockedBy: null,
      lockedAt: null,
    };

    await existingExam.save();

    await auditLogger({
      user: req.user.id,
      action: "UPDATE_EXAM",
      details: `Exam updated by ${req.user.name}: ${existingExam.title}`,
      targetId: existingExam._id,
      req,
    });

    res.json({
      message: "Exam updated successfully",
      exam: existingExam,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const togglePublishExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    if (!canEditExam(exam, req.user)) {
      return res.status(403).json({
        message: "You do not have publish permission for this exam",
      });
    }

    if (new Date() >= new Date(exam.startTime)) {
      return res.status(403).json({
        message: "Cannot change publish status after exam has started",
      });
    }

    if (!exam.isPublished) {
      const questionError = validateQuestions(exam.questions);

      if (questionError) {
        return res.status(400).json({
          message: questionError,
        });
      }

      exam.totalMarks = calculateTotalMarks(exam.questions);
    }

    exam.isPublished = !exam.isPublished;

    await exam.save();

    if (exam.isPublished && exam.createdRole === "admin") {
      await generateTokensForAdminExam(exam, req);
    }

    await auditLogger({
      user: req.user.id,
      action: exam.isPublished ? "PUBLISH_EXAM" : "UNPUBLISH_EXAM",
      details: `${exam.title}`,
      targetId: exam._id,
      req,
    });

    res.json({
      message:
        exam.isPublished && exam.createdRole === "admin"
          ? "Exam published and student tokens sent successfully"
          : exam.isPublished
          ? "Exam published successfully"
          : "Exam unpublished successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const updateExamEditors = async (req, res) => {
  try {
    const { allowedEditors } = req.body;

    const exam = await Exam.findById(req.params.id);

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    if (!isOwner(exam, req.user.id)) {
      return res.status(403).json({
        message: "Only exam owner can manage editors",
      });
    }

    if (new Date() >= new Date(exam.startTime)) {
      return res.status(403).json({
        message: "Cannot update editors after exam has started",
      });
    }

    const validEditors = await User.find({
      _id: {
        $in: Array.isArray(allowedEditors) ? allowedEditors : [],
      },
      role: "faculty",
      department: exam.department,
      isApproved: true,
      isBlocked: false,
    }).select("_id");

    exam.allowedEditors = validEditors.map((user) => user._id);

    await exam.save();

    await auditLogger({
      user: req.user.id,
      action: "UPDATE_EXAM_EDITORS",
      details: `Updated collaborative editors for exam: ${exam.title}`,
      targetId: exam._id,
      req,
    });

    res.json({
      message: "Exam editors updated successfully",
      exam,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createExam,
  getAllExams,
  getDepartmentFaculty,
  getStudentExams,
  verifyAdminExamToken,
  lockExam,
  unlockExam,
  deleteExam,
  updateExam,
  togglePublishExam,
  updateExamEditors,
};
