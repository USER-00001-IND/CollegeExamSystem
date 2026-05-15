import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function AdminProctorView() {
  const [searchParams] = useSearchParams();

  const [examId, setExamId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStudents = async (id = examId) => {
    if (!id.trim()) {
      toast.error("Enter exam ID");
      return;
    }

    try {
      setLoading(true);

      const res = await API.get(`/proctor/exam-students/${id}`);

      setStudents(res.data || []);
      setStudentId("");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load students"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (selectedStudentId = studentId, id = examId) => {
    if (!id.trim()) {
      toast.error("Enter exam ID");
      return;
    }

    try {
      setLoading(true);

      const query = selectedStudentId
        ? `/proctor/logs?exam=${id}&student=${selectedStudentId}`
        : `/proctor/logs?exam=${id}`;

      const res = await API.get(query);

      setLogs(res.data || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load logs"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const examFromUrl = searchParams.get("exam");

    if (examFromUrl) {
      setExamId(examFromUrl);
      loadStudents(examFromUrl);
      loadLogs("", examFromUrl);
    }
  }, []);

  useEffect(() => {
    if (studentId) {
      loadLogs(studentId);
    }
  }, [studentId]);

  const getSnapshotSrc = (snapshotUrl) => {
    const baseUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "";

    return `${baseUrl}${snapshotUrl}`;
  };

  return (
    <div className="modern-dashboard">
      <main className="modern-main">
        <header className="modern-topbar">
          <div className="topbar-left">
            <h1>Proctor Logs and Snapshots</h1>
          </div>

          <div className="topbar-right">
            <a href="/admin-exams">
              <button>Back to Admin Exams</button>
            </a>
          </div>
        </header>

        <section className="modern-content">
          <section className="modern-panel">
            <div className="panel-header">
              <h2>Exam Wise Monitoring</h2>
            </div>

            <div className="create-test-form">
              <label>Exam ID</label>

              <input
                value={examId}
                onChange={(e) => setExamId(e.target.value)}
                placeholder="Paste exam ID"
              />

              <button
                type="button"
                onClick={() => {
                  loadStudents();
                  loadLogs("");
                }}
              >
                Load Students
              </button>

              <button type="button" onClick={() => loadLogs("")}>
                View All Logs
              </button>
            </div>
          </section>

          <section className="modern-panel">
            <div className="panel-header">
              <h2>Students</h2>
            </div>

            {loading ? (
              <p>Loading...</p>
            ) : students.length === 0 ? (
              <p className="empty-text">No students found.</p>
            ) : (
              <div className="modern-table-wrap">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Email</th>
                      <th>Snapshots</th>
                      <th>Violations</th>
                      <th>Last Activity</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {students.map((item) => (
                      <tr key={item.student?._id}>
                        <td>{item.student?.name}</td>
                        <td>{item.student?.email}</td>
                        <td>{item.snapshotCount}</td>
                        <td>{item.violationCount}</td>
                        <td>
                          {item.lastActivity
                            ? new Date(item.lastActivity).toLocaleString()
                            : "N/A"}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setStudentId(item.student?._id)}
                          >
                            View Timeline
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="modern-panel">
            <div className="panel-header">
              <h2>Timeline</h2>
            </div>

            {logs.length === 0 ? (
              <p className="empty-text">No logs loaded.</p>
            ) : (
              <div className="activity-list">
                {logs.map((log) => (
                  <div className="activity-item" key={log._id}>
                    <div
                      className={
                        log.type === "snapshot"
                          ? "activity-icon green"
                          : "activity-icon orange"
                      }
                    >
                      {log.type === "snapshot" ? "S" : "V"}
                    </div>

                    <div>
                      <h4>{log.type}</h4>
                      <p>{log.message}</p>
                      <p>
                        {log.student?.name} |{" "}
                        {new Date(log.createdAt).toLocaleString()}
                      </p>

                      {log.snapshotUrl && (
                        <img
                          src={getSnapshotSrc(log.snapshotUrl)}
                          alt="Snapshot"
                          style={{
                            width: "220px",
                            borderRadius: "10px",
                            marginTop: "10px",
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

export default AdminProctorView;