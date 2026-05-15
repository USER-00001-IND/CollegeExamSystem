const fs = require("fs");
const path = require("path");

const ProctorLog = require("../models/ProctorLog");

const SNAPSHOT_ROOT =
  process.env.SNAPSHOT_DIR ||
  path.join(__dirname, "..", "uploads", "snapshots");

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, {
      recursive: true,
    });
  }
};

const saveBase64Image = (image, exam, student) => {
  const matches = image.match(/^data:image\/(png|jpg|jpeg);base64,(.+)$/);

  if (!matches) {
    throw new Error("Invalid image format");
  }

  const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
  const base64Data = matches[2];

  const examDir = path.join(SNAPSHOT_ROOT, String(exam));
  const studentDir = path.join(examDir, String(student));

  ensureDir(studentDir);

  const fileName = `snapshot_${Date.now()}.${ext}`;
  const filePath = path.join(studentDir, fileName);

  fs.writeFileSync(filePath, base64Data, "base64");

  return {
    fileName,
    filePath,
    relativePath: path.join(String(exam), String(student), fileName),
  };
};

const saveSnapshot = async (req, res) => {
  try {
    const { exam, image } = req.body;

    const student = req.user.id;

    if (!exam || !image) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    if (image.length > 800000) {
      return res.status(400).json({
        message: "Snapshot image too large",
      });
    }

    const savedImage = saveBase64Image(image, exam, student);

    await ProctorLog.create({
      exam,
      student,
      image: "",
      imagePath: savedImage.relativePath,
      type: "snapshot",
      message: "Camera snapshot captured",
    });

    res.json({
      message: "Snapshot saved",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const saveViolation = async (req, res) => {
  try {
    const { exam, type, message } = req.body;

    const student = req.user.id;

    if (!exam || !type) {
      return res.status(400).json({
        message: "Exam and violation type are required",
      });
    }

    await ProctorLog.create({
      exam,
      student,
      type,
      message,
    });

    res.json({
      message: "Violation saved",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  saveSnapshot,
  saveViolation,
};