const fs = require("fs");
const path = require("path");

const ProctorLog = require("../models/ProctorLog");

const SNAPSHOT_ROOT =
  process.env.SNAPSHOT_DIR ||
  path.join(__dirname, "..", "uploads", "snapshots");

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

const makeSnapshotUrl = (log) => {
  if (!log.imagePath) return "";

  return `/api/proctor/snapshot-file/${log._id}`;
};

const getSnapshots = async (req, res) => {
  try {
    const { exam, student, type, startDate, endDate } = req.query;

    const query = {};

    if (exam) query.exam = exam;
    if (student) query.student = student;
    if (type) query.type = type;

    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    let logs = await ProctorLog.find(query)
      .populate("student", "name email stream classSemester")
      .populate(
        "exam",
        "title subject stream classSemester department departmentVisibility createdBy"
      )
      .sort({
        createdAt: -1,
      });

    if (req.user.role === "faculty") {
      logs = logs.filter((log) => canViewExamActivity(log.exam, req.user));
    }

    const formattedLogs = logs.map((log) => {
      const item = log.toObject();

      item.snapshotUrl = makeSnapshotUrl(item);

      return item;
    });

    res.json(formattedLogs);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getExamProctorStudents = async (req, res) => {
  try {
    const { examId } = req.params;

    let logs = await ProctorLog.find({
      exam: examId,
    })
      .populate("student", "name email stream classSemester")
      .populate(
        "exam",
        "title subject department departmentVisibility"
      )
      .sort({
        createdAt: -1,
      });

    if (req.user.role === "faculty") {
      logs = logs.filter((log) => canViewExamActivity(log.exam, req.user));
    }

    const studentMap = new Map();

    logs.forEach((log) => {
      if (!log.student?._id) return;

      const studentId = String(log.student._id);

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: log.student,
          totalLogs: 0,
          snapshotCount: 0,
          violationCount: 0,
          lastActivity: log.createdAt,
        });
      }

      const item = studentMap.get(studentId);

      item.totalLogs += 1;

      if (log.type === "snapshot") {
        item.snapshotCount += 1;
      } else {
        item.violationCount += 1;
      }

      if (new Date(log.createdAt) > new Date(item.lastActivity)) {
        item.lastActivity = log.createdAt;
      }
    });

    res.json(Array.from(studentMap.values()));
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const getSnapshotFile = async (req, res) => {
  try {
    const log = await ProctorLog.findById(req.params.id).populate(
      "exam",
      "department departmentVisibility"
    );

    if (!log) {
      return res.status(404).json({
        message: "Snapshot not found",
      });
    }

    if (!canViewExamActivity(log.exam, req.user)) {
      return res.status(403).json({
        message: "You cannot view this snapshot",
      });
    }

    if (!log.imagePath) {
      return res.status(404).json({
        message: "Snapshot file not found",
      });
    }

    const filePath = path.join(SNAPSHOT_ROOT, log.imagePath);
    const normalizedRoot = path.resolve(SNAPSHOT_ROOT);
    const normalizedFile = path.resolve(filePath);

    if (!normalizedFile.startsWith(normalizedRoot)) {
      return res.status(403).json({
        message: "Invalid snapshot path",
      });
    }

    if (!fs.existsSync(normalizedFile)) {
      return res.status(404).json({
        message: "Snapshot file missing on server",
      });
    }

    res.sendFile(normalizedFile);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  getSnapshots,
  getExamProctorStudents,
  getSnapshotFile,
};