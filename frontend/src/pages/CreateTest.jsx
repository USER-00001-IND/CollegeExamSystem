import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function CreateTest() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [questionBank, setQuestionBank] = useState([]);
  const [showQuestionBank, setShowQuestionBank] = useState(false);

  const [streams, setStreams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [form, setForm] = useState({
    title: "",
    subject: "",
    stream: "",
    classSemester: "",
    duration: "",
    startTime: "",
    endTime: "",
    securitySettings: {
      fullscreen: false,
      disableRightClick: false,
      disableCopyPaste: false,
      tabSwitchWarning: false,
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

  const calculatedTotalMarks = questions.reduce(
    (total, q) => total + Number(q.marks || 0),
    0
  );

  useEffect(() => {
    let ignore = false;

    const fetchStreams = async () => {
      try {
        const res = await API.get("/academics/streams");

        if (!ignore) {
          setStreams(res.data);
        }
      } catch (error) {
        if (ignore) return;

        console.log(error);
        toast.error("Failed to load streams");
      }
    };

    fetchStreams();

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

  const fetchSubjects = async (
  streamId,
  className
) => {
  if (!streamId || !className) {
    setSubjects([]);
    return;
  }

  try {
    const res = await API.get(
      "/academics/subjects"
    );

    const filtered = res.data.filter(
      (item) => {
        const sameStream =
          item.stream?._id === streamId;

        const sameClass =
          item.classSemester?.name ===
          className;

        if (
          !sameStream ||
          !sameClass
        ) {
          return false;
        }

        if (
          item.departmentMode ===
            "none" ||
          item.departmentMode ===
            "all"
        ) {
          return true;
        }

        if (
          item.departmentMode ===
          "single"
        ) {
          return (
            item
              .allowedDepartments?.[0]
              ?.name ===
            user.department
          );
        }

        if (
          item.departmentMode ===
          "multiple"
        ) {
          return item.allowedDepartments?.some(
            (dept) =>
              dept.name ===
              user.department
          );
        }

        return false;
      }
    );

    setSubjects(filtered);
  } catch (error) {
    console.log(error);

    toast.error(
      "Failed to load subjects"
    );
  }
};

  const fetchQuestionBank = async () => {
    try {
      if (!form.subject || !form.stream || !form.classSemester) {
        toast.error("Select subject, stream and class first");
        return;
      }

      const selectedStream = streams.find((item) => item._id === form.stream);

      const res = await API.get(
        `/question-bank?subject=${encodeURIComponent(
          form.subject
        )}&stream=${encodeURIComponent(
          selectedStream?.name || ""
        )}&classSemester=${encodeURIComponent(form.classSemester)}`
      );

      setQuestionBank(res.data);
      setShowQuestionBank(true);

      if (res.data.length === 0) {
        toast.info("No matching questions found");
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to load question bank");
    }
  };

  const addQuestionFromBank = (question) => {
    const alreadyExists = questions.some(
      (q) => q.questionText.trim() === question.questionText.trim()
    );

    if (alreadyExists) {
      toast.warning("Question already added");
      return;
    }

    setQuestions([
      ...questions,
      {
        type: question.type,
        questionText: question.questionText,
        options:
          question.type === "mcq"
            ? question.options || ["", "", "", ""]
            : [],
        correctAnswer: question.correctAnswer || "",
        marks: question.marks,
      },
    ]);

    toast.success("Question added from bank");
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
      updatedForm.subject = "";

      setClasses([]);
      setSubjects([]);
      fetchClasses(value);
    }

    if (name === "classSemester") {
      updatedForm.subject = "";
      fetchSubjects(updatedForm.stream, value);
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
    setShowQuestionBank(false);
    setQuestionBank([]);
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

    if (!form.subject || !form.stream || !form.classSemester) {
      toast.error("Subject, stream and class are required");
      return;
    }

    try {
      const selectedStream = streams.find((item) => item._id === form.stream);

      const cleanedQuestions = questions.map((q) => ({
        ...q,
        options:
          q.type === "mcq"
            ? q.options.filter((opt) => opt.trim())
            : [],
        correctAnswer: q.type === "mcq" ? q.correctAnswer : "",
        marks: Number(q.marks),
      }));

      const payload = {
        ...form,
        stream: selectedStream?.name || "",
        duration: Number(form.duration),
        totalMarks: calculatedTotalMarks,
        questions: cleanedQuestions,
      };

      const res = await API.post("/exams/create", payload);

      toast.success(res.data.message || "Exam created successfully");

      setTimeout(() => {
        window.location.href = "/manage-exams";
      }, 1200);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create exam");
    }
  };

  return (
    <div className="dashboard-main">
      <h1>Create Test</h1>

      <p className="empty-text">
        Department: {user?.department || "Not assigned"}
      </p>

      <form className="create-test-form" onSubmit={submitExam}>
        <input
          name="title"
          placeholder="Test Title"
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
            <option
              key={item._id}
              value={item._id}
            >
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

        <select
          name="subject"
          required
          value={form.subject}
          onChange={handleChange}
          disabled={!form.classSemester}
        >
          <option value="">
            {form.classSemester ? "Select Subject" : "Select class first"}
          </option>

          {subjects.map((item) => (
            <option
              key={item._id}
              value={item.name}
            >
              {item.name} (
              {item.courseCategory})
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

        <div className="question-bank-header">
          <h2>Question Bank</h2>

          <button type="button" onClick={fetchQuestionBank}>
            Add From Question Bank
          </button>
        </div>

        {showQuestionBank ? (
          questionBank.length === 0 ? (
            <p className="empty-text">No matching questions found</p>
          ) : (
            <div className="modern-table-wrap">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Question</th>
                    <th>Marks</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {questionBank.map((question) => (
                    <tr key={question._id}>
                      <td>{question.type}</td>

                      <td>{question.questionText}</td>

                      <td>{question.marks}</td>

                      <td>
                        <button
                          type="button"
                          onClick={() => addQuestionFromBank(question)}
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

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

        <button type="submit">Save Test</button>
      </form>
    </div>
  );
}

export default CreateTest;
