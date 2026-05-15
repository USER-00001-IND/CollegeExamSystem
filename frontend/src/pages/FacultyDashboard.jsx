import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function FacultyDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [exams, setExams] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const examRes = await API.get("/exams");
        const submissionRes = await API.get("/submissions");

        setExams(examRes.data);
        setSubmissions(submissionRes.data);

        setLoading(false);
      } catch (error) {
        console.log(error);

        toast.error("Failed to load dashboard");

        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);
  useEffect(() => {
  const interval = setInterval(async () => {
    try {
      await API.get("/protected/dashboard");
    } catch (error) {
      console.log("Session check failed", error);
    }
  }, 15000);

  return () => clearInterval(interval);
}, []);
  const activeExams = exams.filter((exam) => {
    const now = new Date();
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);

    return (
      exam.isPublished &&
      now >= start &&
      now <= end
    );
  });

  const upcomingExams = exams
    .filter(
      (exam) =>
        new Date(exam.startTime) >
        new Date()
    )
    .slice(0, 5);

  const recentActivities = [
    {
      title: `${exams.length} exams created`,
      text: "Your total created exams",
      time: "Now",
      color: "blue",
      letter: "E",
    },
    {
      title: `${activeExams.length} active exams`,
      text: "Currently live exams",
      time: "Now",
      color: "green",
      letter: "A",
    },
    {
      title: `${submissions.length} submissions received`,
      text: "Student submissions available",
      time: "Now",
      color: "orange",
      letter: "S",
    },
    {
      title: "Proctor logs available",
      text: "Student monitoring active",
      time: "Now",
      color: "purple",
      letter: "P",
    },
  ];

  return (
    <div className="modern-dashboard">
      <aside className="modern-sidebar">
        <div className="brand-box">
          <div className="brand-icon">
            F
          </div>

          <div>
            <h2>Faculty Panel</h2>
            <p>{user?.name}</p>
          </div>
        </div>

        <nav className="modern-nav">
          <a
            className="active"
            href="/faculty-dashboard"
          >
            Dashboard
          </a>

          <a href="/manage-exams">
            Manage Exams
          </a>

          <a href="/create-test">
            Create Test
          </a>

          <a href="/question-bank">
            Question Bank
          </a>

          <a href="/results">
            Results
          </a>

          <a href="/proctor-logs">
            Proctor Logs
          </a>

          <button
            onClick={logout}
            className="modern-logout"
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="modern-main">
        <header className="modern-topbar">
          <div className="topbar-left">
            <div>
              <h1>
                Welcome, {user?.name}
              </h1>
            </div>
          </div>

          <div className="topbar-right">
            <div className="admin-profile">
              <div className="avatar">
                {user?.name
                  ?.charAt(0)
                  ?.toUpperCase() || "F"}
              </div>

              <div>
                <h4>
                  {user?.name ||
                    "Faculty"}
                </h4>

                <p>{user?.email}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="modern-content">
          {loading ? (
            <div className="modern-loader">
              Loading dashboard...
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon blue-soft">
                    E
                  </div>

                  <div>
                    <h3>Total Exams</h3>

                    <h2>
                      {exams.length}
                    </h2>

                    <p className="up-text">
                      Created exams
                    </p>
                  </div>

                  <div className="mini-chart blue-chart"></div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orange-soft">
                    A
                  </div>

                  <div>
                    <h3>Active Exams</h3>

                    <h2>
                      {
                        activeExams.length
                      }
                    </h2>

                    <p className="up-text">
                      Currently live
                    </p>
                  </div>

                  <div className="mini-chart orange-chart"></div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green-soft">
                    S
                  </div>

                  <div>
                    <h3>Submissions</h3>

                    <h2>
                      {
                        submissions.length
                      }
                    </h2>

                    <p className="up-text">
                      Student answers
                    </p>
                  </div>

                  <div className="mini-chart green-chart"></div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon purple-soft">
                    P
                  </div>

                  <div>
                    <h3>Security</h3>

                    <h2>On</h2>

                    <p>
                      Proctor enabled
                    </p>
                  </div>
                </div>
              </div>

              <div className="dashboard-two-col">
                <section className="modern-panel">
                  <div className="panel-header">
                    <h2>
                      Recent Activities
                    </h2>

                    <button>
                      View All
                    </button>
                  </div>

                  <div className="activity-list">
                    {recentActivities.map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          className="activity-item"
                          key={index}
                        >
                          <div
                            className={`activity-icon ${item.color}`}
                          >
                            {
                              item.letter
                            }
                          </div>

                          <div>
                            <h4>
                              {
                                item.title
                              }
                            </h4>

                            <p>
                              {
                                item.text
                              }
                            </p>
                          </div>

                          <span>
                            {
                              item.time
                            }
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </section>

                <section className="modern-panel">
                  <div className="panel-header">
                    <h2>
                      Upcoming Exams
                    </h2>

                    <a href="/manage-exams">
                      <button>
                        View Calendar
                      </button>
                    </a>
                  </div>

                  {upcomingExams.length ===
                  0 ? (
                    <p className="empty-text">
                      No upcoming exams.
                    </p>
                  ) : (
                    <div className="modern-table-wrap">
                      <table className="modern-table">
                        <thead>
                          <tr>
                            <th>
                              Exam Name
                            </th>

                            <th>
                              Class
                            </th>

                            <th>
                              Date & Time
                            </th>

                            <th>
                              Status
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {upcomingExams.map(
                            (
                              exam
                            ) => (
                              <tr
                                key={
                                  exam._id
                                }
                              >
                                <td>
                                  {
                                    exam.title
                                  }
                                </td>

                                <td>
                                  {
                                    exam.classSemester
                                  }
                                </td>

                                <td>
                                  {new Date(
                                    exam.startTime
                                  ).toLocaleString()}
                                </td>

                                <td>
                                  <span
                                    className={
                                      exam.isPublished
                                        ? "status-pill active"
                                        : "status-pill pending"
                                    }
                                  >
                                    {exam.isPublished
                                      ? "Scheduled"
                                      : "Draft"}
                                  </span>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>

              <section className="modern-panel">
                <div className="panel-header">
                  <h2>
                    Quick Actions
                  </h2>
                </div>

                <div className="quick-grid faculty-quick-grid">
                  <a
                    href="/create-test"
                    className="quick-card"
                  >
                    <span className="quick-icon blue-soft">
                      C
                    </span>

                    <div>
                      <h4>
                        Create Test
                      </h4>

                      <p>
                        Create a new exam
                      </p>
                    </div>
                  </a>

                  <a
                    href="/manage-exams"
                    className="quick-card"
                  >
                    <span className="quick-icon green-soft">
                      M
                    </span>

                    <div>
                      <h4>
                        Manage Exams
                      </h4>

                      <p>
                        Edit or publish exams
                      </p>
                    </div>
                  </a>

                  <a
                    href="/question-bank"
                    className="quick-card"
                  >
                    <span className="quick-icon purple-soft">
                      Q
                    </span>

                    <div>
                      <h4>
                        Question Bank
                      </h4>

                      <p>
                        Reusable questions
                      </p>
                    </div>
                  </a>

                  <a
                    href="/results"
                    className="quick-card"
                  >
                    <span className="quick-icon orange-soft">
                      R
                    </span>

                    <div>
                      <h4>
                        Results
                      </h4>

                      <p>
                        View student marks
                      </p>
                    </div>
                  </a>

                  <a
                    href="/proctor-logs"
                    className="quick-card"
                  >
                    <span className="quick-icon blue-soft">
                      P
                    </span>

                    <div>
                      <h4>
                        Proctor Logs
                      </h4>

                      <p>
                        Monitor student activity
                      </p>
                    </div>
                  </a>
                </div>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default FacultyDashboard;