const express = require("express");
const AuditLog = require("../models/AuditLog");

const {
  authMiddleware,
  roleMiddleware,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  async (req, res) => {
    try {
      const logs = await AuditLog.find()
        .populate({
          path: "user",
          select: "name email role",
          options: { lean: true },
        })
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      const safeLogs = logs.map((log) => ({
        ...log,
        user: log.user || {
          name: "Deleted User",
          email: "N/A",
          role: "N/A",
        },
        details: log.details || "",
        ipAddress: log.ipAddress || "N/A",
      }));

      res.json(safeLogs);
    } catch (error) {
      console.log("Audit logs load failed:", error);

      res.status(500).json({
        message: "Failed to load audit logs",
      });
    }
  }
);

module.exports = router;