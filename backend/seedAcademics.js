require("dotenv").config();
const mongoose = require("mongoose");

const Department = require("./models/Department");
const Stream = require("./models/Stream");
const ClassSemester = require("./models/ClassSemester");
const Subject = require("./models/Subject");

const MONGO_URI = process.env.MONGO_URI;

const departments = [
  ["Computer Science", "CS"],
  ["Mathematics", "MATH"],
  ["Physics", "PHY"],
  ["Chemistry", "CHEM"],
  ["Botany", "BOT"],
  ["Zoology", "ZOO"],
  ["English", "ENG"],
  ["Political Science", "POL"],
  ["History", "HIS"],
  ["Education", "EDU"],
  ["Economics", "ECO"],
  ["Assamese", "ASM"],
  ["Sociology", "SOC"],
];

const streams = ["Arts", "Science"];

const classesByStream = {
  Arts: [
    "HS 1",
    "HS 2",
    "BA 1st Semester",
    "BA 2nd Semester",
  ],
  Science: [
    "HS 1",
    "HS 2",
    "BSc 1st Semester",
    "BSc 2nd Semester",
  ],
};

const hsCommonSubjects = [
  ["English", "ENG"],
  ["Alternative English", "ALTENG"],
  ["Assamese", "ASM"],
  ["Bodo", "BODO"],
];

const hsArtsSubjects = [
  ["History", "HIS"],
  ["Political Science", "POL"],
  ["Education", "EDU"],
  ["Economics", "ECO"],
  ["Sociology", "SOC"],
];

const hsScienceSubjects = [
  ["Physics", "PHY"],
  ["Chemistry", "CHEM"],
  ["Mathematics", "MATH"],
  ["Biology", "BIO"],
];

async function upsertDepartment(name, code) {
  return Department.findOneAndUpdate(
    { code },
    {
      name,
      code,
      active: true,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function upsertStream(name) {
  return Stream.findOneAndUpdate(
    { name },
    {
      name,
      active: true,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function upsertClass(streamId, name) {
  return ClassSemester.findOneAndUpdate(
    {
      stream: streamId,
      name,
    },
    {
      stream: streamId,
      name,
      active: true,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function upsertSubject({
  name,
  code,
  stream,
  classSemester,
  courseCategory,
  departmentMode,
  allowedDepartments = [],
}) {
  return Subject.findOneAndUpdate(
    {
      code,
      stream,
      classSemester,
    },
    {
      name,
      code,
      stream,
      classSemester,
      courseCategory,
      departmentMode,
      allowedDepartments,
      active: true,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function seed() {
  if (!MONGO_URI) {
    throw new Error("MONGO_URI missing in .env");
  }

  await mongoose.connect(MONGO_URI);

  console.log("MongoDB connected");

  const deptMap = {};

  for (const [name, code] of departments) {
    const dept = await upsertDepartment(name, code);
    deptMap[code] = dept._id;
  }

  const streamMap = {};

  for (const name of streams) {
    const stream = await upsertStream(name);
    streamMap[name] = stream._id;
  }

  const classMap = {};

  for (const streamName of Object.keys(classesByStream)) {
    for (const className of classesByStream[streamName]) {
      const cls = await upsertClass(streamMap[streamName], className);
      classMap[`${streamName}-${className}`] = cls._id;
    }
  }

  for (const streamName of ["Arts", "Science"]) {
    for (const className of ["HS 1", "HS 2"]) {
      const suffix =
        className === "HS 1"
          ? streamName === "Arts"
            ? "HS1A"
            : "HS1S"
          : streamName === "Arts"
          ? "HS2A"
          : "HS2S";

      const streamId = streamMap[streamName];
      const classId = classMap[`${streamName}-${className}`];

      const subjectList = [
        ...hsCommonSubjects,
        ...(streamName === "Arts" ? hsArtsSubjects : hsScienceSubjects),
      ];

      for (const [subjectName, subjectCode] of subjectList) {
        await upsertSubject({
          name: subjectName,
          code: `${subjectCode}-${suffix}`,
          stream: streamId,
          classSemester: classId,
          courseCategory: "common",
          departmentMode: "none",
        });
      }
    }
  }

  const ugCommonSubjects = [
    ["English Communication", "AEC-ENG", "aec"],
    ["Environmental Studies", "VAC-EVS", "vac"],
    ["Digital Literacy", "SEC-DL", "sec"],
    ["Indian Constitution", "MDC-IC", "mdc"],
  ];

  const ugTargets = [
    ["Arts", "BA 1st Semester", "BA1"],
    ["Science", "BSc 1st Semester", "BSC1"],
  ];

  for (const [streamName, className, suffix] of ugTargets) {
    const streamId = streamMap[streamName];
    const classId = classMap[`${streamName}-${className}`];

    for (const [subjectName, baseCode, category] of ugCommonSubjects) {
      await upsertSubject({
        name: subjectName,
        code: `${baseCode}-${suffix}`,
        stream: streamId,
        classSemester: classId,
        courseCategory: category,
        departmentMode: "all",
      });
    }
  }

  await upsertSubject({
    name: "Computer Science Major",
    code: "CS-MAJ-BSC1",
    stream: streamMap.Science,
    classSemester: classMap["Science-BSc 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.CS],
  });

  await upsertSubject({
    name: "Mathematics Major",
    code: "MATH-MAJ-BSC1",
    stream: streamMap.Science,
    classSemester: classMap["Science-BSc 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.MATH],
  });

  await upsertSubject({
    name: "Physics Major",
    code: "PHY-MAJ-BSC1",
    stream: streamMap.Science,
    classSemester: classMap["Science-BSc 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.PHY],
  });

  await upsertSubject({
    name: "Chemistry Major",
    code: "CHEM-MAJ-BSC1",
    stream: streamMap.Science,
    classSemester: classMap["Science-BSc 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.CHEM],
  });

  await upsertSubject({
    name: "Botany Major",
    code: "BOT-MAJ-BSC1",
    stream: streamMap.Science,
    classSemester: classMap["Science-BSc 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.BOT],
  });

  await upsertSubject({
    name: "Zoology Major",
    code: "ZOO-MAJ-BSC1",
    stream: streamMap.Science,
    classSemester: classMap["Science-BSc 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.ZOO],
  });

  await upsertSubject({
    name: "Mathematics Minor",
    code: "MATH-MIN-BSC1",
    stream: streamMap.Science,
    classSemester: classMap["Science-BSc 1st Semester"],
    courseCategory: "minor",
    departmentMode: "multiple",
    allowedDepartments: [deptMap.CS, deptMap.PHY, deptMap.CHEM],
  });

  await upsertSubject({
    name: "Computer Science Minor",
    code: "CS-MIN-BSC1",
    stream: streamMap.Science,
    classSemester: classMap["Science-BSc 1st Semester"],
    courseCategory: "minor",
    departmentMode: "multiple",
    allowedDepartments: [deptMap.MATH, deptMap.PHY],
  });

  await upsertSubject({
    name: "English Major",
    code: "ENG-MAJ-BA1",
    stream: streamMap.Arts,
    classSemester: classMap["Arts-BA 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.ENG],
  });

  await upsertSubject({
    name: "Political Science Major",
    code: "POL-MAJ-BA1",
    stream: streamMap.Arts,
    classSemester: classMap["Arts-BA 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.POL],
  });

  await upsertSubject({
    name: "History Major",
    code: "HIS-MAJ-BA1",
    stream: streamMap.Arts,
    classSemester: classMap["Arts-BA 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.HIS],
  });

  await upsertSubject({
    name: "Education Major",
    code: "EDU-MAJ-BA1",
    stream: streamMap.Arts,
    classSemester: classMap["Arts-BA 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.EDU],
  });

  await upsertSubject({
    name: "Economics Major",
    code: "ECO-MAJ-BA1",
    stream: streamMap.Arts,
    classSemester: classMap["Arts-BA 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.ECO],
  });

  await upsertSubject({
    name: "Assamese Major",
    code: "ASM-MAJ-BA1",
    stream: streamMap.Arts,
    classSemester: classMap["Arts-BA 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.ASM],
  });

  await upsertSubject({
    name: "Sociology Major",
    code: "SOC-MAJ-BA1",
    stream: streamMap.Arts,
    classSemester: classMap["Arts-BA 1st Semester"],
    courseCategory: "major",
    departmentMode: "single",
    allowedDepartments: [deptMap.SOC],
  });

  await upsertSubject({
    name: "Sociology Minor",
    code: "SOC-MIN-BA1",
    stream: streamMap.Arts,
    classSemester: classMap["Arts-BA 1st Semester"],
    courseCategory: "minor",
    departmentMode: "multiple",
    allowedDepartments: [deptMap.ENG, deptMap.POL, deptMap.EDU],
  });

  await upsertSubject({
    name: "Political Science Minor",
    code: "POL-MIN-BA1",
    stream: streamMap.Arts,
    classSemester: classMap["Arts-BA 1st Semester"],
    courseCategory: "minor",
    departmentMode: "multiple",
    allowedDepartments: [deptMap.ENG, deptMap.HIS, deptMap.SOC],
  });

  console.log("Academic seed completed");

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);

  await mongoose.disconnect();

  process.exit(1);
});