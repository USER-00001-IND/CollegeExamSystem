import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function StudentHistory() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [historyExams, setHistoryExams] = useState([]);
  const [submittedExams, setSubmittedExams] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await API.get("/exams/student");

        const now = new Date();

        const endedExams = res.data.filter((exam) => {
          return new Date(exam.endTime) < now;
        });

        setHistoryExams(endedExams);

        const statusMap = {};

        for (const exam of endedExams) {
          const statusRes = await API.get(
            `/submissions/check?exam=${exam._id}`
          );

          statusMap[exam._id] = statusRes.data.submitted;
        }

        setSubmittedExams(statusMap);

        setLoading(false);
      } catch (error) {
        console.log(error);
        toast.error("Failed to load history");
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="modern-dashboard">
      <aside className="modern-sidebar">
        <div className="brand-box">
          <div className="brand-icon">S</div>

          <div>
            <h2>Student Panel</h2>
            <p>{user?.name}</p>
          </div>
        </div>

        <nav className="modern-nav">
          <a href="/student-dashboard">Dashboard</a>

          <a className="active" href="/student-history">
            Exam History
          </a>

          <a href="/student-results">Results</a>
        </nav>
      </aside>

      <main className="modern-main">
        <header className="modern-topbar">
          <div className="topbar-left">
            <div>
              <h1>Exam History</h1>
              <p>Ended exams are listed here.</p>
            </div>
          </div>
        </header>

        <section className="modern-content">
          <section className="modern-panel">
            <div className="panel-header">
              <h2>History</h2>
            </div>

            {loading ? (
              <div className="modern-loader">Loading...</div>
            ) : historyExams.length === 0 ? (
              <p className="empty-text">No history found.</p>
            ) : (
              <div className="modern-table-wrap">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Subject</th>
                      <th>Marks</th>
                      <th>Status</th>
                      <th>Result</th>
                    </tr>
                  </thead>

                  <tbody>
                    {historyExams.map((exam) => {
                      const submitted = submittedExams[exam._id];

                      return (
                        <tr key={exam._id}>
                          <td>{exam.title}</td>

                          <td>{exam.subject}</td>

                          <td>{exam.totalMarks}</td>

                          <td>
                            <span
                              className={
                                submitted
                                  ? "status-pill active"
                                  : "status-pill danger"
                              }
                            >
                              {submitted ? "Attempted" : "Not Attempted"}
                            </span>
                          </td>

                          <td>
                            {submitted ? (
                              <a href="/student-results">
                                <button className="approve-btn">
                                  View Result
                                </button>
                              </a>
                            ) : (
                              <button disabled>No Result</button>
                            )}
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

export default StudentHistory;