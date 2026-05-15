const AuditLog = require("../models/AuditLog");

const auditLogger = async ({
  user = null,
  action,
  details = "",
  targetId = null,
  req,
}) => {
  try {
    if (!action) return;

    const forwardedFor = req?.headers?.["x-forwarded-for"];
    const ipAddress = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(",")[0] ||
        req?.socket?.remoteAddress ||
        "";

    await AuditLog.create({
      user,
      action,
      details,
      targetId,
      ipAddress,
    });
  } catch (error) {
    console.log("Audit log failed:", error.message);
  }
};

module.exports = auditLogger;