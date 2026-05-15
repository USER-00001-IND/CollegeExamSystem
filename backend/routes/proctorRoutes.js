const express = require("express");

const {
  saveSnapshot,
  saveViolation,
} = require("../controllers/proctorController");

const {
  getSnapshots,
  getExamProctorStudents,
  getSnapshotFile,
} = require("../controllers/proctorViewController");

const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/snapshot",
  authMiddleware,
  roleMiddleware("student"),
  saveSnapshot
);

router.post(
  "/violation",
  authMiddleware,
  roleMiddleware("student"),
  saveViolation
);

router.get(
  "/logs",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  getSnapshots
);

router.get(
  "/exam-students/:examId",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  getExamProctorStudents
);

router.get(
  "/snapshot-file/:id",
  authMiddleware,
  roleMiddleware("faculty", "admin"),
  getSnapshotFile
);

module.exports = router;