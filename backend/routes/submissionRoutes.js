const express = require("express");

const {
  submitExam,
  getSubmissions,
  getMySubmissions,
  checkSubmission,
  saveProgress,
  getProgress,
  getStudentScoreCard,
  getFacultyClassResults,
} = require("../controllers/submissionController");

const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/submit",
  authMiddleware,
  roleMiddleware("student"),
  submitExam
);

router.post(
  "/save-progress",
  authMiddleware,
  roleMiddleware("student"),
  saveProgress
);

router.get(
  "/progress",
  authMiddleware,
  roleMiddleware("student"),
  getProgress
);

router.get(
  "/check",
  authMiddleware,
  roleMiddleware("student"),
  checkSubmission
);

router.get(
  "/my-results",
  authMiddleware,
  roleMiddleware("student"),
  getMySubmissions
);

router.get(
  "/student-scorecard",
  authMiddleware,
  roleMiddleware("student"),
  getStudentScoreCard
);

router.get(
  "/faculty-class-results",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  getFacultyClassResults
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  getSubmissions
);

module.exports = router;