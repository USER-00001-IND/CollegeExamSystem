const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    action: {
      type: String,
      required: true,
      trim: true,
    },

    details: {
      type: String,
      default: "",
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    ipAddress: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);