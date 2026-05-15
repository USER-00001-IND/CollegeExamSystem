import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function ManageExams() {
  const [exams, setExams] = useState([]);
  const [editingExam, setEditingExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [departmentFaculty, setDepartmentFaculty] = useState([]);
  const [editorExam, setEditorExam] = useState(null);
  const [selectedEditors, setSelectedEditors] = useState([]);

  const formatForInput = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);
    const pad = (num) => String(num).padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const calculateTotalMarks = (questions = []) => {
    return questions.reduce((total, q) => total + Number(q.marks || 0), 0);
  };

  const fetchExams = async () => {
    try {
      setLoading(true);

      const res = await API.get("/exams");

      setExams(res.data);

      setLoading(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to fetch exams");
      setLoading(false);
    }
  };

  const fetchDepartmentFaculty = async () => {
    try {
      const res = await API.get("/exams/department-faculty");

      setDepartmentFaculty(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchDepartmentFaculty();
  }, []);

  const filteredExams = exams.filter((exam) =>
    `${exam.title} ${exam.subject} ${exam.stream} ${exam.classSemester} ${
      exam.createdBy?.name || ""
    }`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const startEdit = (exam) => {
    setEditingExam({
      ...exam,
      startTime: formatForInput(exam.startTime),
      endTime: formatForInput(exam.endTime),
      questions:
        exam.questions?.length > 0
          ? exam.questions.map((q) => ({
              type: q.type || "mcq",
              questionText: q.questionText || "",
              options:
                q.type === "mcq"
                  ? q.options?.length
                    ? q.options
                    : ["", "", "", ""]
                  : [],
              correctAnswer: q.correctAnswer || "",
              marks: q.marks || "",
            }))
          : [
              {
                type: "mcq",
                questionText: "",
                options: ["", "", "", ""],
                correctAnswer: "",
                marks: "",
              },
            ],
    });
  };

  const lockAndEditExam = async (exam) => {
    try {
      await API.put(`/exams/lock/${exam._id}`);

      startEdit(exam);

      fetchExams();
    } catch (error) {
      console.log(error);

      toast.error(error.response?.data?.message || "Unable to lock exam");
    }
  };

  const unlockCurrentExam = async () => {
    try {
      if (!editingExam?._id) return;

      await API.put(`/exams/unlock/${editingExam._id}`);
    } catch (error) {
      console.log(error);
    }
  };

  const cancelEdit = async () => {
    await unlockCurrentExam();

    setEditingExam(null);

    fetchExams();
  };

  const deleteExam = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this exam?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/exams/${id}`);

      toast.success("Exam deleted successfully");

      fetchExams();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const updateExam = async (e) => {
    e.preventDefault();

    try {
      const cleanedQuestions = editingExam.questions.map((q) => ({
        type: q.type,
        questionText: q.questionText,
        options:
          q.type === "mcq"
            ? q.options.filter((opt) => String(opt || "").trim())
            : [],
        correctAnswer: q.type === "mcq" ? q.correctAnswer : "",
        marks: Number(q.marks),
      }));

      const payload = {
        ...editingExam,
        duration: Number(editingExam.duration),
        totalMarks: calculateTotalMarks(cleanedQuestions),
        questions: cleanedQuestions,
      };

      await API.put(`/exams/${editingExam._id}`, payload);

      await unlockCurrentExam();

      toast.success("Exam updated successfully");

      setEditingExam(null);

      fetchExams();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Update failed");
    }
  };

  const togglePublish = async (exam) => {
    const action = exam.isPublished ? "unpublish" : "publish";

    const confirmAction = window.confirm(
      `Are you sure you want to ${action} this exam?`
    );

    if (!confirmAction) return;

    try {
      await API.put(`/exams/publish/${exam._id}`);

      toast.success(
        exam.isPublished
          ? "Exam unpublished successfully"
          : "Exam published successfully"
      );

      fetchExams();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Publish update failed");
    }
  };

  const openEditorsModal = (exam) => {
    setEditorExam(exam);

    setSelectedEditors(exam.allowedEditors?.map((item) => item._id) || []);
  };

  const toggleEditorSelection = (facultyId) => {
    setSelectedEditors((prev) =>
      prev.includes(facultyId)
        ? prev.filter((id) => id !== facultyId)
        : [...prev, facultyId]
    );
  };

  const saveEditors = async () => {
    try {
      await API.put(`/exams/editors/${editorExam._id}`, {
        allowedEditors: selectedEditors,
      });

      toast.success("Editors updated successfully");

      setEditorExam(null);

      fetchExams();
    } catch (error) {
      console.log(error);

      toast.error(error.response?.data?.message || "Failed to update editors");
    }
  };

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...editingExam.questions];

    updatedQuestions[index][field] = value;

    if (field === "type" && value !== "mcq") {
      updatedQuestions[index].options = [];
      updatedQuestions[index].correctAnswer = "";
    }

    if (field === "type" && value === "mcq") {
      updatedQuestions[index].options = ["", "", "", ""];
      updatedQuestions[index].correctAnswer = "";
    }

    setEditingExam({
      ...editingExam,
      questions: updatedQuestions,
    });
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...editingExam.questions];

    updatedQuestions[questionIndex].options[optionIndex] = value;

    if (
      !updatedQuestions[questionIndex].options.includes(
        updatedQuestions[questionIndex].correctAnswer
      )
    ) {
      updatedQuestions[questionIndex].correctAnswer = "";
    }

    setEditingExam({
      ...editingExam,
      questions: updatedQuestions,
    });
  };

  const addQuestion = () => {
    setEditingExam({
      ...editingExam,
      questions: [
        ...editingExam.questions,
        {
          type: "mcq",
          questionText: "",
          options: ["", "", "", ""],
          correctAnswer: "",
          marks: "",
        },
      ],
    });
  };

  const removeQuestion = (index) => {
    const updatedQuestions = editingExam.questions.filter((_, i) => i !== index);

    setEditingExam({
      ...editingExam,
      questions: updatedQuestions,
    });
  };

  const addOption = (questionIndex) => {
    const updatedQuestions = [...editingExam.questions];

    updatedQuestions[questionIndex].options.push("");

    setEditingExam({
      ...editingExam,
      questions: updatedQuestions,
    });
  };

  const removeOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...editingExam.questions];

    updatedQuestions[questionIndex].options = updatedQuestions[
      questionIndex
    ].options.filter((_, i) => i !== optionIndex);

    if (
      !updatedQuestions[questionIndex].options.includes(
        updatedQuestions[questionIndex].correctAnswer
      )
    ) {
      updatedQuestions[questionIndex].correctAnswer = "";
    }

    setEditingExam({
      ...editingExam,
      questions: updatedQuestions,
    });
  };

  return (
    <div className="dashboard-page">
      <aside className="sidebar faculty-sidebar">
        <h2>Faculty Panel</h2>

        <nav>
          <a href="/faculty-dashboard">Dashboard</a>
          <a href="/create-test">Create Test</a>
          <a href="/question-bank">Question Bank</a>
          <a href="/manage-exams">Manage Exams</a>
          <a href="/results">Results</a>
          <a href="/proctor-logs">Proctor Logs</a>
        </nav>
      </aside>

      <main className="dashboard-main">
        <h1>Manage Exams</h1>

        <div className="dashboard-search page-search">
          <input
            type="text"
            placeholder="Search exam..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="modern-loader">Loading exams...</div>
        ) : (
          <>
            {editingExam && (
              <form className="create-test-form" onSubmit={updateExam}>
                <h2>Edit Exam</h2>

                <input
                  value={editingExam.title}
                  onChange={(e) =>
                    setEditingExam({
                      ...editingExam,
                      title: e.target.value,
                    })
                  }
                  placeholder="Title"
                  required
                />

                <input
                  value={editingExam.subject}
                  onChange={(e) =>
                    setEditingExam({
                      ...editingExam,
                      subject: e.target.value,
                    })
                  }
                  placeholder="Subject"
                  required
                />

                <input
                  value={editingExam.stream}
                  onChange={(e) =>
                    setEditingExam({
                      ...editingExam,
                      stream: e.target.value,
                    })
                  }
                  placeholder="Stream"
                  required
                />

                <input
                  value={editingExam.classSemester}
                  onChange={(e) =>
                    setEditingExam({
                      ...editingExam,
                      classSemester: e.target.value,
                    })
                  }
                  placeholder="Class / Semester"
                  required
                />

                <input
                  type="number"
                  value={editingExam.duration}
                  onChange={(e) =>
                    setEditingExam({
                      ...editingExam,
                      duration: e.target.value,
                    })
                  }
                  placeholder="Duration"
                  required
                />

                <div className="total-marks-box">
                  Total Marks: {calculateTotalMarks(editingExam.questions)}
                </div>

                <label>Start Time</label>

                <input
                  type="datetime-local"
                  value={editingExam.startTime}
                  onChange={(e) =>
                    setEditingExam({
                      ...editingExam,
                      startTime: e.target.value,
                    })
                  }
                  required
                />

                <label>End Time</label>

                <input
                  type="datetime-local"
                  value={editingExam.endTime}
                  onChange={(e) =>
                    setEditingExam({
                      ...editingExam,
                      endTime: e.target.value,
                    })
                  }
                  required
                />

                <h2>Questions</h2>

                {editingExam.questions.map((q, index) => (
                  <div className="question-box" key={index}>
                    <div className="question-header">
                      <h3>Question {index + 1}</h3>

                      {editingExam.questions.length > 1 && (
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
                        updateQuestion(index, "type", e.target.value)
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
                        updateQuestion(index, "questionText", e.target.value)
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
                                updateOption(index, optIndex, e.target.value)
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
                            updateQuestion(
                              index,
                              "correctAnswer",
                              e.target.value
                            )
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
                        updateQuestion(index, "marks", e.target.value)
                      }
                    />
                  </div>
                ))}

                <button type="button" onClick={addQuestion}>
                  Add Question
                </button>

                <div className="manage-actions compact-actions">
                  <button type="submit">Save Changes</button>

                  <button type="button" onClick={cancelEdit}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {editorExam && (
              <div className="submit-modal-overlay">
                <div className="submit-modal">
                  <h2>Manage Editors</h2>

                  <p>Select same department faculty who can edit this exam.</p>

                  <div className="editor-list">
                    {departmentFaculty.length === 0 ? (
                      <p>No faculty found.</p>
                    ) : (
                      departmentFaculty.map((faculty) => (
                        <label key={faculty._id} className="editor-item">
                          <input
                            type="checkbox"
                            checked={selectedEditors.includes(faculty._id)}
                            onChange={() =>
                              toggleEditorSelection(faculty._id)
                            }
                          />

                          <span>
                            {faculty.name} ({faculty.email})
                          </span>
                        </label>
                      ))
                    )}
                  </div>

                  <div className="submit-modal-actions">
                    <button type="button" onClick={saveEditors}>
                      Save Editors
                    </button>

                    <button type="button" onClick={() => setEditorExam(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {filteredExams.length === 0 ? (
              <p className="empty-text">No exams found.</p>
            ) : (
              <div className="modern-table-wrap">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>SL</th>
                      <th>Title</th>
                      <th>Author</th>
                      <th>Subject</th>
                      <th>Class</th>
                      <th>Questions</th>
                      <th>Total Marks</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Access</th>
                      <th>Lock Status</th>
                      <th>Start Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredExams.map((exam, index) => {
                      const hasStarted = new Date() >= new Date(exam.startTime);

                      return (
                        <tr key={exam._id}>
                          <td>{index + 1}</td>

                          <td>{exam.title}</td>

                          <td>{exam.createdBy?.name || "Unknown"}</td>

                          <td>{exam.subject}</td>

                          <td>{exam.classSemester}</td>

                          <td>{exam.questions?.length || 0}</td>

                          <td>{exam.totalMarks}</td>

                          <td>{exam.duration} min</td>

                          <td>
                            <span
                              className={
                                exam.isPublished
                                  ? "status-pill active"
                                  : "status-pill pending"
                              }
                            >
                              {exam.isPublished ? "Published" : "Draft"}
                            </span>
                          </td>

                          <td>
                            {exam.isOwner ? (
                              <span className="status-pill active">Owner</span>
                            ) : exam.canEdit ? (
                              <span className="status-pill pending">
                                Editor
                              </span>
                            ) : (
                              <span className="status-pill">View Only</span>
                            )}
                          </td>

                          <td>
                            {exam.isLocked ? (
                              <span className="status-pill pending">
                                Locked by{" "}
                                {exam.editingLock?.lockedBy?.name || "Faculty"}
                              </span>
                            ) : (
                              <span className="status-pill active">
                                Available
                              </span>
                            )}
                          </td>

                          <td>{new Date(exam.startTime).toLocaleString()}</td>

                          <td>
                            <div className="table-actions">
                              {exam.canEdit && (
                                <button
                                  disabled={
                                    hasStarted ||
                                    exam.isPublished ||
                                    exam.isLocked
                                  }
                                  onClick={() => lockAndEditExam(exam)}
                                >
                                  Edit
                                </button>
                              )}

                              {exam.canEdit && (
                                <button
                                  disabled={hasStarted}
                                  onClick={() => togglePublish(exam)}
                                >
                                  {exam.isPublished ? "Unpublish" : "Publish"}
                                </button>
                              )}

                              {exam.isOwner && (
                                <button
                                  className="small-delete-btn"
                                  disabled={hasStarted || exam.isPublished}
                                  onClick={() => deleteExam(exam._id)}
                                >
                                  Delete
                                </button>
                              )}

                              {exam.canShare && (
                                <button onClick={() => openEditorsModal(exam)}>
                                  Editors
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default ManageExams;