const express = require("express");

const User = require("../models/User");
const Submission = require("../models/Submission");

const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/faculty",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const faculty = await User.find({
        role: "faculty",
      }).select("-password");

      res.json(faculty);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.get(
  "/students",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const students = await User.find({
        role: "student",
      }).select("-password");

      res.json(students);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.put(
  "/approve-faculty/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        {
          isApproved: true,
        },
        {
          new: true,
        }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "Faculty not found",
        });
      }

      res.json({
        message: "Faculty approved successfully",
        user,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.delete(
  "/user/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (user.role === "admin") {
        return res.status(403).json({
          message: "Admin account cannot be deleted",
        });
      }

      await User.findByIdAndDelete(req.params.id);

      res.json({
        message: "User deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.get(
  "/reports",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const { classSemester } = req.query;

      const students = await User.find({
        role: "student",
        classSemester,
      }).select("-password");

      const reports = await Promise.all(
        students.map(async (student) => {
          const submissions = await Submission.find({
            student: student._id,
          }).populate("exam");

          const totalExams = submissions.length;

          const totalScore = submissions.reduce(
            (sum, item) => sum + (item.score || 0),
            0
          );

          const totalMarks = submissions.reduce(
            (sum, item) => sum + (item.exam?.totalMarks || 0),
            0
          );

          const performance =
            totalMarks > 0 ? ((totalScore / totalMarks) * 100).toFixed(2) : 0;

          let status = "Poor";

          if (performance >= 75) {
            status = "Good";
          } else if (performance >= 40) {
            status = "Average";
          }

          return {
            _id: student._id,
            name: student.name,
            email: student.email,
            classSemester: student.classSemester,
            examsAttempted: totalExams,
            totalExams,
            performance,
            status,
          };
        })
      );

      res.json(reports);
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.put(
  "/verify-user-email/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        {
          isEmailVerified: true,
          emailOtp: null,
          emailOtpExpires: null,
        },
        {
          new: true,
        }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json({
        message: "User email verified successfully",
        user,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.put(
  "/toggle-block-user/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (user.role === "admin") {
        return res.status(403).json({
          message: "Admin account cannot be blocked",
        });
      }

      user.isBlocked = !user.isBlocked;
      user.sessionVersion += 1;

      await user.save();

      res.json({
        message: user.isBlocked
          ? "User blocked and logged out successfully"
          : "User unblocked successfully",
        user,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.put(
  "/force-logout-user/:id",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (user.role === "admin") {
        return res.status(403).json({
          message: "Admin account cannot be force logged out",
        });
      }

      user.sessionVersion += 1;

      await user.save();

      res.json({
        message: "User logged out from all devices successfully",
        user,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  }
);

module.exports = router;