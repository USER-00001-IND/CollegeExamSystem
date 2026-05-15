const express = require("express");

const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard", authMiddleware, async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

module.exports = router;