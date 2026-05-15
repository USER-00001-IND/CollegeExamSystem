import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function LiveExam() {
  const [liveExams, setLiveExams] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLiveExams = async () => {
    try {
      setLoading(true);

      const res = await API.get("/admin/live-exams");

      const onlyLive = res.data.filter(
        (exam) => exam.liveStatus === "Live"
      );

      setLiveExams(onlyLive);
      setLoading(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load live exams");
      setLoading(false);
    }
  };

  const viewCandidates = async (exam) => {
    try {
      setSelectedExam(exam);

      const res = await API.get(
        `/admin/live-exam-candidates/${exam._id}`
      );

      setCandidates(res.data);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load candidates");
    }
  };

  useEffect(() => {
    fetchLiveExams();
  }, []);

  return (
    <div className="dashboard-page">
      <aside className="sidebar admin-sidebar">
        <h2>Admin Panel</h2>

        <nav>
          <a href="/admin-dashboard">Dashboard</a>
          <a href="/live-exams">Live Exam</a>
          <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              window.location.href = "/login";
            }}
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="dashboard-main">
        <h1>Live Exam Controller</h1>

        <button className="export-btn" onClick={fetchLiveExams}>
          Refresh
        </button>

        {loading ? (
          <div className="modern-loader">Loading live exams...</div>
        ) : liveExams.length === 0 ? (
          <p className="empty-text">No live exams right now.</p>
        ) : (
          <div className="modern-table-wrap">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>SL</th>
                  <th>Exam</th>
                  <th>Subject</th>
                  <th>Stream</th>
                  <th>Class</th>
                  <th>Faculty</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Active</th>
                  <th>Submitted</th>
                  <th>Proctor Logs</th>
                  <th>Candidates</th>
                </tr>
              </thead>

              <tbody>
                {liveExams.map((exam, index) => (
                  <tr key={exam._id}>
                    <td>{index + 1}</td>
                    <td>{exam.title}</td>
                    <td>{exam.subject}</td>
                    <td>{exam.stream}</td>
                    <td>{exam.classSemester}</td>
                    <td>{exam.faculty?.name || "N/A"}</td>
                    <td>{new Date(exam.startTime).toLocaleString()}</td>
                    <td>{new Date(exam.endTime).toLocaleString()}</td>
                    <td>{exam.activeCandidates}</td>
                    <td>{exam.totalSubmissions}</td>
                    <td>{exam.proctorLogs}</td>
                    <td>
                      <button onClick={() => viewCandidates(exam)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedExam && (
          <section className="modern-panel section-title">
            <div className="panel-header">
              <h2>Candidates, {selectedExam.title}</h2>

              <button
                type="button"
                onClick={() => {
                  setSelectedExam(null);
                  setCandidates([]);
                }}
              >
                Close
              </button>
            </div>

            <div className="modern-table-wrap">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>SL</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Stream</th>
                    <th>Class</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {candidates.map((student, index) => (
                    <tr key={student._id}>
                      <td>{index + 1}</td>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{student.stream}</td>
                      <td>{student.classSemester}</td>
                      <td>
                        <span
                          className={
                            student.status === "Active"
                              ? "status-pill active"
                              : student.status === "Submitted"
                              ? "status-pill pending"
                              : "status-pill danger"
                          }
                        >
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default LiveExam;