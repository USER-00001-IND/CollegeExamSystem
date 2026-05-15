const mongoose = require("mongoose");

const classSemesterSchema =
  new mongoose.Schema(
    {
      stream: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Stream",
        required: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      active: {
        type: Boolean,
        default: true,
      },
    },
    { timestamps: true }
  );

classSemesterSchema.index(
  {
    stream: 1,
    name: 1,
  },
  { unique: true }
);

module.exports = mongoose.model(
  "ClassSemester",
  classSemesterSchema
);