const express = require("express");

const {
  createExam,
  getAllExams,
  getDepartmentFaculty,
  getStudentExams,
  verifyAdminExamToken,
  deleteExam,
  updateExam,
  togglePublishExam,
  updateExamEditors,
  lockExam,
  unlockExam,
} = require("../controllers/examController");

const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/create",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  createExam
);

router.get(
  "/department-faculty",
  authMiddleware,
  roleMiddleware("faculty"),
  getDepartmentFaculty
);

router.get(
  "/",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  getAllExams
);

router.get(
  "/student",
  authMiddleware,
  roleMiddleware("student"),
  getStudentExams
);

router.post(
  "/verify-token",
  authMiddleware,
  roleMiddleware("student"),
  verifyAdminExamToken
);

router.put(
  "/publish/:id",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  togglePublishExam
);

router.put(
  "/editors/:id",
  authMiddleware,
  roleMiddleware("faculty"),
  updateExamEditors
);

router.put(
  "/lock/:id",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  lockExam
);

router.put(
  "/unlock/:id",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  unlockExam
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  updateExam
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  deleteExam
);

module.exports = router;