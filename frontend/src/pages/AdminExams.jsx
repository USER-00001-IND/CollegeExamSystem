import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function AdminExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [facultyList, setFacultyList] = useState([]);
  const [evaluatorExam, setEvaluatorExam] = useState(null);
  const [selectedEvaluators, setSelectedEvaluators] = useState([]);

  const fetchExams = async () => {
    try {
      setLoading(true);

      const res = await API.get("/exams");

      const adminExams = res.data.filter(
        (exam) => exam.createdRole === "admin"
      );

      setExams(adminExams);
      setLoading(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load admin exams");
      setLoading(false);
    }
  };

  const fetchFaculty = async () => {
    try {
      const res = await API.get("/admin/faculty");
      setFacultyList(res.data);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load faculty list");
    }
  };

  useEffect(() => {
    fetchExams();
    fetchFaculty();
  }, []);

  const filteredExams = exams.filter((exam) =>
    `${exam.title} ${exam.subject} ${exam.stream} ${exam.classSemester}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const togglePublish = async (exam) => {
    const message = exam.isPublished
      ? "Unpublish this admin exam?"
      : "Publish this admin exam and send tokens to eligible students?";

    if (!window.confirm(message)) return;

    try {
      const res = await API.put(`/exams/publish/${exam._id}`);

      toast.success(res.data.message || "Publish status updated");
      fetchExams();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Publish update failed");
    }
  };

  const deleteExam = async (exam) => {
    if (!window.confirm("Delete this admin exam? This cannot be undone.")) {
      return;
    }

    try {
      await API.delete(`/exams/${exam._id}`);

      toast.success("Admin exam deleted successfully");
      fetchExams();
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  const getExamTimeStatus = (exam) => {
    const now = new Date();
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);

    if (now < start) return "Scheduled";
    if (now > end) return "Ended";

    return "Live";
  };

  const getTimeStatusClass = (status) => {
    if (status === "Live") return "status-pill active";
    if (status === "Scheduled") return "status-pill pending";

    return "status-pill danger";
  };

  const hasStarted = (exam) => {
    return new Date() >= new Date(exam.startTime);
  };

  const openEvaluatorModal = (exam) => {
    setEvaluatorExam(exam);

    setSelectedEvaluators(
      exam.assignedEvaluators?.map((item) => item._id || item) || []
    );
  };

  const toggleEvaluator = (facultyId) => {
    setSelectedEvaluators((prev) =>
      prev.includes(facultyId)
        ? prev.filter((id) => id !== facultyId)
        : [...prev, facultyId]
    );
  };

  const saveEvaluators = async () => {
    if (!evaluatorExam) return;

    if (selectedEvaluators.length === 0) {
      toast.error("Select at least one evaluator");
      return;
    }

    try {
      await API.put(`/marking/assign-evaluators/${evaluatorExam._id}`, {
        evaluatorIds: selectedEvaluators,
      });

      toast.success("Evaluators assigned successfully");

      setEvaluatorExam(null);
      setSelectedEvaluators([]);

      fetchExams();
    } catch (error) {
      console.log(error);

      toast.error(
        error.response?.data?.message || "Failed to assign evaluators"
      );
    }
  };

  return (
    <div className="modern-dashboard">
      <aside className="modern-sidebar">
        <div className="brand-box">
          <div className="brand-icon">A</div>

          <div>
            <h2>Exam System</h2>
            <p>Admin Exams</p>
          </div>
        </div>

        <nav className="modern-nav">
          <a href="/admin-dashboard">Dashboard</a>

          <a className="active" href="/admin-exams">
            Admin Exams
          </a>

          <a href="/create-admin-exam">Create Admin Exam</a>

          <a href="/live-exams">Live Exam</a>

          <a href="/admin-result-workflow">Result Workflow</a>

          <a href="/admin-dashboard#audit">Audit Logs</a>
        </nav>
      </aside>

      <main className="modern-main">
        <header className="modern-topbar">
          <div className="topbar-left">
            <h1>Admin Exams</h1>
          </div>

          <div className="topbar-right">
            <a href="/create-admin-exam">
              <button>Create Admin Exam</button>
            </a>
          </div>
        </header>

        <section className="modern-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue-soft">E</div>

              <div>
                <h3>Total Admin Exams</h3>
                <h2>{exams.length}</h2>
                <p>Created by admin</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green-soft">P</div>

              <div>
                <h3>Published</h3>
                <h2>{exams.filter((exam) => exam.isPublished).length}</h2>
                <p>Tokens sent after publish</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange-soft">D</div>

              <div>
                <h3>Draft</h3>
                <h2>{exams.filter((exam) => !exam.isPublished).length}</h2>
                <p>Not visible to students</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple-soft">T</div>

              <div>
                <h3>Token Entry</h3>
                <h2>ON</h2>
                <p>Required for admin exams</p>
              </div>
            </div>
          </div>

          {evaluatorExam && (
            <div className="submit-modal-overlay">
              <div className="submit-modal">
                <h2>Assign Evaluators</h2>

                <p>Selected faculty will evaluate submitted papers anonymously.</p>

                <p>
                  Exam: <strong>{evaluatorExam.title}</strong>
                </p>

                <div className="editor-list">
                  {facultyList.length === 0 ? (
                    <p>No faculty found.</p>
                  ) : (
                    facultyList.map((faculty) => (
                      <label key={faculty._id} className="editor-item">
                        <input
                          type="checkbox"
                          checked={selectedEvaluators.includes(faculty._id)}
                          onChange={() => toggleEvaluator(faculty._id)}
                        />

                        <span>
                          {faculty.name} ({faculty.email})
                        </span>
                      </label>
                    ))
                  )}
                </div>

                <div className="submit-modal-actions">
                  <button type="button" onClick={saveEvaluators}>
                    Save Evaluators
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEvaluatorExam(null);
                      setSelectedEvaluators([]);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <section className="modern-panel">
            <div className="panel-header">
              <h2>Admin Exam List</h2>

              <button type="button" onClick={fetchExams}>
                Refresh
              </button>
            </div>

            <div className="dashboard-search page-search">
              <input
                type="text"
                placeholder="Search admin exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="modern-loader">Loading admin exams...</div>
            ) : filteredExams.length === 0 ? (
              <p className="empty-text">No admin exams found.</p>
            ) : (
              <div className="modern-table-wrap">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>SL</th>
                      <th>Title</th>
                      <th>Subject</th>
                      <th>Stream</th>
                      <th>Class</th>
                      <th>Questions</th>
                      <th>Marks</th>
                      <th>Duration</th>
                      <th>Publish</th>
                      <th>Time</th>
                      <th>Start</th>
                      <th>Token</th>
                      <th>Evaluators</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredExams.map((exam, index) => {
                      const timeStatus = getExamTimeStatus(exam);
                      const started = hasStarted(exam);

                      return (
                        <tr key={exam._id}>
                          <td>{index + 1}</td>

                          <td>{exam.title}</td>

                          <td>{exam.subject}</td>

                          <td>{exam.stream}</td>

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
                            <span className={getTimeStatusClass(timeStatus)}>
                              {timeStatus}
                            </span>
                          </td>

                          <td>{new Date(exam.startTime).toLocaleString()}</td>

                          <td>
                            <span className="status-pill pending">Required</span>
                          </td>

                          <td>
                            <span
                              className={
                                exam.assignedEvaluators?.length
                                  ? "status-pill active"
                                  : "status-pill pending"
                              }
                            >
                              {exam.assignedEvaluators?.length || 0} Assigned
                            </span>
                          </td>

                          <td>
                            <div className="table-actions">
                              <button
                                type="button"
                                disabled={started}
                                onClick={() => openEvaluatorModal(exam)}
                              >
                                Evaluators
                              </button>

                              <a href={`/admin-proctor-view?exam=${exam._id}`}>
                                <button type="button">Proctor Logs</button>
                              </a>

                              <button
                                type="button"
                                disabled={started}
                                onClick={() => togglePublish(exam)}
                              >
                                {exam.isPublished ? "Unpublish" : "Publish"}
                              </button>

                              <button
                                type="button"
                                className="small-delete-btn"
                                disabled={exam.isPublished || started}
                                onClick={() => deleteExam(exam)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default AdminExams;