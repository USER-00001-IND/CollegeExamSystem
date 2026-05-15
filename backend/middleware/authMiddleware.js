const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "No token provided",
        code: "NO_TOKEN",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "No token provided",
        code: "NO_TOKEN",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (decoded.sessionVersion !== user.sessionVersion) {
      return res.status(401).json({
        message: "Session expired. Logged in on another device.",
        code: "SESSION_EXPIRED",
      });
    }

    if (user.role === "faculty" && !user.isApproved) {
      return res.status(403).json({
        message: "Faculty approval pending",
        code: "FACULTY_NOT_APPROVED",
      });
    }

    req.user = {
      id: user._id.toString(),
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      department: user.department,
      stream: user.stream,
      classSemester: user.classSemester,
      majorSubjects: user.majorSubjects,
      minorSubjects: user.minorSubjects,
      commonSubjects: user.commonSubjects,
      electiveSubjects: user.electiveSubjects,
      selectedSubjects: user.selectedSubjects,
      subjectSelectionCompleted: user.subjectSelectionCompleted,
      isApproved: user.isApproved,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }

    return res.status(401).json({
      message: "Invalid token",
      code: "INVALID_TOKEN",
    });
  }
};

const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
        code: "AUTH_REQUIRED",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
        code: "ACCESS_DENIED",
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  roleMiddleware,
};
