const express = require("express");

const Department = require("../models/Department");
const Stream = require("../models/Stream");
const ClassSemester = require("../models/ClassSemester");
const Subject = require("../models/Subject");

const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/departments",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { name, code } = req.body;

      if (!name || !code) {
        return res.status(400).json({
          message: "Department name and code are required",
        });
      }

      const department = await Department.create({
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
      });

      res.status(201).json({
        message: "Department created successfully",
        department,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.get("/departments", async (req, res) => {
  try {
    const departments = await Department.find({
      active: true,
    }).sort({ name: 1 });

    res.json(departments);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.post(
  "/streams",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json({
          message: "Stream name is required",
        });
      }

      const stream = await Stream.create({
        name: String(name).trim(),
      });

      res.status(201).json({
        message: "Stream created successfully",
        stream,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.get("/streams", async (req, res) => {
  try {
    const streams = await Stream.find({
      active: true,
    }).sort({ name: 1 });

    res.json(streams);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.post(
  "/classes",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { stream, name } = req.body;

      if (!stream || !name) {
        return res.status(400).json({
          message: "Stream and class name are required",
        });
      }

      const classSemester = await ClassSemester.create({
        stream,
        name: String(name).trim(),
      });

      res.status(201).json({
        message: "Class created successfully",
        classSemester,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.get("/classes", async (req, res) => {
  try {
    const { stream } = req.query;

    const filter = {
      active: true,
    };

    if (stream) {
      filter.stream = stream;
    }

    const classes = await ClassSemester.find(filter)
      .populate("stream", "name")
      .sort({ name: 1 });

    res.json(classes);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

router.post(
  "/subjects",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const {
        name,
        code,
        stream,
        classSemester,
        courseCategory,
        departmentMode,
        allowedDepartments,
      } = req.body;

      if (
        !name ||
        !code ||
        !stream ||
        !classSemester ||
        !courseCategory ||
        !departmentMode
      ) {
        return res.status(400).json({
          message:
            "Subject name, code, stream, class, category and department mode are required",
        });
      }

      const cleanAllowedDepartments = Array.isArray(allowedDepartments)
        ? allowedDepartments.filter(Boolean)
        : [];

      if (
        departmentMode === "single" &&
        cleanAllowedDepartments.length !== 1
      ) {
        return res.status(400).json({
          message: "Single department mode requires exactly one department",
        });
      }

      if (
        departmentMode === "multiple" &&
        cleanAllowedDepartments.length < 2
      ) {
        return res.status(400).json({
          message: "Multiple department mode requires at least two departments",
        });
      }

      if (
        ["none", "all"].includes(departmentMode) &&
        cleanAllowedDepartments.length > 0
      ) {
        return res.status(400).json({
          message:
            "No departments should be selected for none or all department mode",
        });
      }

      const subject = await Subject.create({
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
        stream,
        classSemester,
        courseCategory,
        departmentMode,
        allowedDepartments: cleanAllowedDepartments,
      });

      res.status(201).json({
        message: "Subject created successfully",
        subject,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.get("/subjects", async (req, res) => {
  try {
    const {
      stream,
      classSemester,
      department,
      courseCategory,
    } = req.query;

    const filter = {
      active: true,
    };

    if (stream) filter.stream = stream;
    if (classSemester) filter.classSemester = classSemester;
    if (courseCategory) filter.courseCategory = courseCategory;

    if (department) {
      filter.$or = [
        {
          departmentMode: "none",
        },
        {
          departmentMode: "all",
        },
        {
          allowedDepartments: department,
        },
      ];
    }

    const subjects = await Subject.find(filter)
      .populate("stream", "name")
      .populate("classSemester", "name")
      .populate("allowedDepartments", "name code")
      .sort({
        courseCategory: 1,
        name: 1,
      });

    res.json(subjects);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;