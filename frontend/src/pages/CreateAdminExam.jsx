import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function CreateAdminExam() {
  const [form, setForm] = useState({
    title: "",
    subject: "",
    department: "",
    stream: "",
    classSemester: "",
    duration: "",
    startTime: "",
    endTime: "",
    securitySettings: {
      fullscreen: true,
      disableRightClick: true,
      disableCopyPaste: true,
      tabSwitchWarning: true,
      camera: false,
      microphone: false,
    },
  });

  const [questions, setQuestions] = useState([
    {
      type: "mcq",
      questionText: "",
      options: ["", "", "", ""],
      correctAnswer: "",
      marks: "",
    },
  ]);

  const [departments, setDepartments] = useState([]);
  const [streams, setStreams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const calculatedTotalMarks = questions.reduce(
    (total, q) => total + Number(q.marks || 0),
    0
  );

  useEffect(() => {
    let ignore = false;

    const fetchAcademicData = async () => {
      try {
        const [deptRes, streamRes] = await Promise.all([
          API.get("/academics/departments"),
          API.get("/academics/streams"),
        ]);

        if (!ignore) {
          setDepartments(deptRes.data);
          setStreams(streamRes.data);
        }
      } catch (error) {
        if (ignore) return;

        console.log(error);
        toast.error("Failed to load academic data");
      }
    };

    fetchAcademicData();

    return () => {
      ignore = true;
    };
  }, []);

  const fetchClasses = async (streamId) => {
    if (!streamId) {
      setClasses([]);
      return;
    }

    try {
      const res = await API.get(`/academics/classes?stream=${streamId}`);
      setClasses(res.data);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load classes");
    }
  };

  const fetchSubjects = async (streamId, className, departmentName) => {
    if (!streamId || !className) {
      setSubjects([]);
      return;
    }

    try {
      const res = await API.get("/academics/subjects");

      const filtered = res.data.filter((item) => {
        const sameStream = item.stream?._id === streamId;
        const sameClass = item.classSemester?.name === className;

        if (!sameStream || !sameClass) {
          return false;
        }

        if (
          item.departmentMode === "none" ||
          item.departmentMode === "all"
        ) {
          return true;
        }

        if (!departmentName) {
          return false;
        }

        if (item.departmentMode === "single") {
          return item.allowedDepartments?.[0]?.name === departmentName;
        }

        if (item.departmentMode === "multiple") {
          return item.allowedDepartments?.some(
            (dept) => dept.name === departmentName
          );
        }

        return false;
      });

      setSubjects(filtered);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load subjects");
    }
  };

  const isHSClass = (className) => {
    return className?.startsWith("HS");
  };

  const formatLocalDateTime = (date) => {
    const pad = (num) => String(num).padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    const updatedForm = {
      ...form,
      [name]: value,
    };

    if (name === "stream") {
      updatedForm.classSemester = "";
      updatedForm.department = "";
      updatedForm.subject = "";

      setClasses([]);
      setSubjects([]);

      fetchClasses(value);
    }

    if (name === "classSemester") {
      updatedForm.subject = "";

      if (isHSClass(value)) {
        updatedForm.department = "";
      }

      fetchSubjects(updatedForm.stream, value, updatedForm.department);
    }

    if (name === "department") {
      updatedForm.subject = "";

      if (updatedForm.stream && updatedForm.classSemester) {
        fetchSubjects(updatedForm.stream, updatedForm.classSemester, value);
      }
    }

    if (name === "duration" || name === "startTime") {
      const start = name === "startTime" ? value : updatedForm.startTime;
      const duration = name === "duration" ? value : updatedForm.duration;

      if (start && duration) {
        const endDate = new Date(start);
        endDate.setMinutes(endDate.getMinutes() + Number(duration));
        updatedForm.endTime = formatLocalDateTime(endDate);
      }
    }

    setForm(updatedForm);
  };

  const handleSecurityChange = (e) => {
    setForm({
      ...form,
      securitySettings: {
        ...form.securitySettings,
        [e.target.name]: e.target.checked,
      },
    });
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];

    updated[index][field] = value;

    if (field === "type" && value !== "mcq") {
      updated[index].options = [];
      updated[index].correctAnswer = "";
    }

    if (field === "type" && value === "mcq") {
      updated[index].options = ["", "", "", ""];
      updated[index].correctAnswer = "";
    }

    setQuestions(updated);
  };

  const handleOptionChange = (qIndex, optIndex, value) => {
    const updated = [...questions];

    updated[qIndex].options[optIndex] = value;

    if (updated[qIndex].correctAnswer === "") {
      updated[qIndex].correctAnswer = value;
    }

    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        type: "mcq",
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        marks: "",
      },
    ]);
  };

  const removeQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const addOption = (index) => {
    const updated = [...questions];
    updated[index].options.push("");
    setQuestions(updated);
  };

  const removeOption = (qIndex, optIndex) => {
    const updated = [...questions];

    updated[qIndex].options = updated[qIndex].options.filter(
      (_, i) => i !== optIndex
    );

    if (!updated[qIndex].options.includes(updated[qIndex].correctAnswer)) {
      updated[qIndex].correctAnswer = "";
    }

    setQuestions(updated);
  };

  const submitExam = async (e) => {
    e.preventDefault();

    if (calculatedTotalMarks <= 0) {
      toast.error("Total marks must be greater than 0");
      return;
    }

    if (!form.stream || !form.classSemester || !form.subject) {
      toast.error("Stream, class and subject are required");
      return;
    }

    if (!isHSClass(form.classSemester) && !form.department) {
      toast.error("Department is required for graduation exams");
      return;
    }

    try {
      const selectedStream = streams.find((item) => item._id === form.stream);

      const cleanedQuestions = questions.map((q) => ({
        ...q,
        options: q.type === "mcq" ? q.options.filter((opt) => opt.trim()) : [],
        correctAnswer: q.type === "mcq" ? q.correctAnswer : "",
        marks: Number(q.marks),
      }));

      const payload = {
        ...form,
        department: isHSClass(form.classSemester) ? "" : form.department,
        stream: selectedStream?.name || "",
        duration: Number(form.duration),
        totalMarks: calculatedTotalMarks,
        questions: cleanedQuestions,
      };

      const res = await API.post("/exams/create", payload);

      toast.success(res.data.message || "Admin exam created successfully");

      setTimeout(() => {
        window.location.href = "/admin-exams";
      }, 1200);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create admin exam");
    }
  };

  return (
    <div className="dashboard-main">
      <h1>Create Admin Exam</h1>

      <p className="empty-text">
        Admin-created exams will require student email and token verification.
        Tokens are sent when the exam is published.
      </p>

      <form className="create-test-form" onSubmit={submitExam}>
        <input
          name="title"
          placeholder="Exam Title"
          required
          value={form.title}
          onChange={handleChange}
        />

        <select
          name="stream"
          required
          value={form.stream}
          onChange={handleChange}
        >
          <option value="">Select Stream</option>

          {streams.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          name="classSemester"
          required
          value={form.classSemester}
          onChange={handleChange}
          disabled={!form.stream}
        >
          <option value="">
            {form.stream ? "Select Class" : "Select stream first"}
          </option>

          {classes.map((item) => (
            <option key={item._id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>

        {!isHSClass(form.classSemester) && form.classSemester && (
          <select
            name="department"
            required={!isHSClass(form.classSemester)}
            value={form.department}
            onChange={handleChange}
          >
            <option value="">Select Department</option>

            {departments.map((dept) => (
              <option key={dept._id} value={dept.name}>
                {dept.name}
              </option>
            ))}
          </select>
        )}

        <select
          name="subject"
          required
          value={form.subject}
          onChange={handleChange}
          disabled={
            !form.classSemester ||
            (!isHSClass(form.classSemester) && !form.department)
          }
        >
          <option value="">
            {form.classSemester
              ? isHSClass(form.classSemester) || form.department
                ? "Select Subject"
                : "Select department first"
              : "Select class first"}
          </option>

          {subjects.map((item) => (
            <option key={item._id} value={item.name}>
              {item.name} ({item.courseCategory})
            </option>
          ))}
        </select>

        <input
          name="duration"
          type="number"
          placeholder="Duration in minutes"
          required
          value={form.duration}
          onChange={handleChange}
        />

        <div className="total-marks-box">
          Total Marks: {calculatedTotalMarks}
        </div>

        <label>Start Time</label>

        <input
          name="startTime"
          type="datetime-local"
          required
          value={form.startTime}
          onChange={handleChange}
        />

        <label>End Time</label>

        <input
          name="endTime"
          type="datetime-local"
          required
          value={form.endTime}
          onChange={handleChange}
        />

        <h2>Security Settings</h2>

        <div className="toggle-grid">
          {Object.keys(form.securitySettings).map((key) => (
            <label key={key} className="toggle-item">
              <input
                type="checkbox"
                name={key}
                checked={form.securitySettings[key]}
                onChange={handleSecurityChange}
              />

              {key}
            </label>
          ))}
        </div>

        <h2>Questions</h2>

        {questions.map((q, index) => (
          <div className="question-box" key={index}>
            <div className="question-header">
              <h3>Question {index + 1}</h3>

              {questions.length > 1 && (
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => removeQuestion(index)}
                >
                  Remove
                </button>
              )}
            </div>

            <select
              value={q.type}
              onChange={(e) =>
                handleQuestionChange(index, "type", e.target.value)
              }
            >
              <option value="mcq">MCQ</option>
              <option value="short">Short Answer</option>
              <option value="long">Long Answer</option>
            </select>

            <textarea
              placeholder="Question text"
              value={q.questionText}
              required
              onChange={(e) =>
                handleQuestionChange(index, "questionText", e.target.value)
              }
            />

            {q.type === "mcq" && (
              <>
                {q.options.map((opt, optIndex) => (
                  <div className="option-row" key={optIndex}>
                    <input
                      placeholder={`Option ${optIndex + 1}`}
                      value={opt}
                      onChange={(e) =>
                        handleOptionChange(index, optIndex, e.target.value)
                      }
                    />

                    {q.options.length > 2 && (
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => removeOption(index, optIndex)}
                      >
                        X
                      </button>
                    )}
                  </div>
                ))}

                <button type="button" onClick={() => addOption(index)}>
                  Add Option
                </button>

                <select
                  value={q.correctAnswer}
                  required
                  onChange={(e) =>
                    handleQuestionChange(index, "correctAnswer", e.target.value)
                  }
                >
                  <option value="">Select Correct Answer</option>

                  {q.options.map((opt, i) => (
                    <option key={i} value={opt}>
                      {opt || `Option ${i + 1}`}
                    </option>
                  ))}
                </select>
              </>
            )}

            <input
              type="number"
              placeholder="Marks"
              value={q.marks}
              required
              onChange={(e) =>
                handleQuestionChange(index, "marks", e.target.value)
              }
            />
          </div>
        ))}

        <button type="button" onClick={addQuestion}>
          Add Question
        </button>

        <button type="submit">Save Admin Exam</button>

        <button
          type="button"
          onClick={() => {
            window.location.href = "/admin-exams";
          }}
        >
          Back to Admin Exams
        </button>
      </form>
    </div>
  );
}

export default CreateAdminExam;
