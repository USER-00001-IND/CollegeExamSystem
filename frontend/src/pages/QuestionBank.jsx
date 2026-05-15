import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    subject: "",
    stream: "",
    classSemester: "",
    type: "mcq",
    questionText: "",
    options: ["", "", "", ""],
    correctAnswer: "",
    marks: 1,
  });

  const fetchQuestions = async () => {
    try {
      setLoading(true);

      const res = await API.get("/question-bank");

      setQuestions(res.data);
      setLoading(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load question bank");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const updateForm = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateOption = (index, value) => {
    const updated = [...form.options];
    updated[index] = value;

    setForm((prev) => ({
      ...prev,
      options: updated,
    }));
  };

  const addQuestion = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        options:
          form.type === "mcq"
            ? form.options.filter((item) => item.trim())
            : [],
        correctAnswer:
          form.type === "mcq" ? form.correctAnswer : "",
        marks: Number(form.marks),
      };

      await API.post("/question-bank", payload);

      toast.success("Question added");

      setForm({
        subject: "",
        stream: "",
        classSemester: "",
        type: "mcq",
        questionText: "",
        options: ["", "", "", ""],
        correctAnswer: "",
        marks: 1,
      });

      fetchQuestions();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Failed to add question");
    }
  };

  const deleteQuestion = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this question from question bank?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/question-bank/${id}`);

      toast.success("Question deleted");

      fetchQuestions();
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete question");
    }
  };

  return (
    <div className="dashboard-page">
      <aside className="sidebar faculty-sidebar">
        <h2>Faculty Panel</h2>

        <nav>
          <a href="/faculty-dashboard">Dashboard</a>
          <a href="/create-test">Create Test</a>
          <a href="/manage-exams">Manage Exams</a>
          <a href="/results">Results</a>
          <a href="/question-bank">Question Bank</a>
          <a href="/proctor-logs">Proctor Logs</a>
        </nav>
      </aside>

      <main className="dashboard-main">
        <h1>Question Bank</h1>

        <form className="create-test-form" onSubmit={addQuestion}>
          <h2>Add Question</h2>

          <label>Subject</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => updateForm("subject", e.target.value)}
            placeholder="Example: Computer Science"
            required
          />

          <label>Stream</label>
          <select
            value={form.stream}
            onChange={(e) => updateForm("stream", e.target.value)}
            required
          >
            <option value="">Select Stream</option>
            <option value="Arts">Arts</option>
            <option value="Science">Science</option>
          </select>

          <label>Class / Semester</label>
          <input
            type="text"
            value={form.classSemester}
            onChange={(e) =>
              updateForm("classSemester", e.target.value)
            }
            placeholder="Example: BSc 4th Semester"
            required
          />

          <label>Question Type</label>
          <select
            value={form.type}
            onChange={(e) => updateForm("type", e.target.value)}
          >
            <option value="mcq">MCQ</option>
            <option value="short">Short Answer</option>
            <option value="long">Long Answer</option>
          </select>

          <label>Question Text</label>
          <textarea
            value={form.questionText}
            onChange={(e) =>
              updateForm("questionText", e.target.value)
            }
            placeholder="Enter question text. LaTeX supported if rendered in exam page."
            required
          />

          {form.type === "mcq" && (
            <>
              <label>Options</label>

              {form.options.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  value={option}
                  onChange={(e) =>
                    updateOption(index, e.target.value)
                  }
                  placeholder={`Option ${index + 1}`}
                />
              ))}

              <label>Correct Answer</label>
              <input
                type="text"
                value={form.correctAnswer}
                onChange={(e) =>
                  updateForm("correctAnswer", e.target.value)
                }
                placeholder="Must match one option"
                required
              />
            </>
          )}

          <label>Marks</label>
          <input
            type="number"
            min="1"
            value={form.marks}
            onChange={(e) => updateForm("marks", e.target.value)}
            required
          />

          <button type="submit">Add to Question Bank</button>
        </form>

        <section className="modern-panel">
          <div className="panel-header">
            <h2>Saved Questions</h2>

            <button type="button" onClick={fetchQuestions}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="modern-loader">Loading question bank...</div>
          ) : questions.length === 0 ? (
            <p className="empty-text">No saved questions found.</p>
          ) : (
            <div className="modern-table-wrap">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>SL</th>
                    <th>Subject</th>
                    <th>Class</th>
                    <th>Type</th>
                    <th>Question</th>
                    <th>Marks</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {questions.map((question, index) => (
                    <tr key={question._id}>
                      <td>{index + 1}</td>
                      <td>{question.subject}</td>
                      <td>{question.classSemester}</td>
                      <td>{question.type}</td>
                      <td>{question.questionText}</td>
                      <td>{question.marks}</td>
                      <td>
                        <button
                          type="button"
                          className="small-delete-btn"
                          onClick={() => deleteQuestion(question._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default QuestionBank;