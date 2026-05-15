import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "../styles/dashboard.css";

function StudentDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));
  const needsSubjectSelection =
    user?.role === "student" && !user?.subjectSelectionCompleted;

  const navigate = useNavigate();

  const [profileImage, setProfileImage] = useState(
    localStorage.getItem("profileImage") || ""
  );

  const [exams, setExams] = useState([]);
  const [submittedExams, setSubmittedExams] = useState({});
  const [now, setNow] = useState(new Date());

  const [tokenExam, setTokenExam] = useState(null);
  const [tokenEmail, setTokenEmail] = useState(user?.email || "");
  const [examToken, setExamToken] = useState("");
  const [verifyingToken, setVerifyingToken] = useState(false);

  const formatSubjectList = (items) => {
    return Array.isArray(items) && items.length ? items.join(", ") : "N/A";
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.replace("/login");
  };

  const updateProfileImage = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      localStorage.setItem("profileImage", reader.result);
      setProfileImage(reader.result);
    };

    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (needsSubjectSelection) {
      navigate("/select-subjects", { replace: true });
    }
  }, [needsSubjectSelection, navigate]);

  useEffect(() => {
    if (needsSubjectSelection) return;

    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [needsSubjectSelection]);

  useEffect(() => {
    if (needsSubjectSelection) return;

    const interval = setInterval(async () => {
      try {
        await API.get("/protected/dashboard");
      } catch (error) {
        console.log("Session check failed", error);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [needsSubjectSelection]);

  useEffect(() => {
    if (needsSubjectSelection) return;

    const fetchExams = async () => {
      try {
        const res = await API.get("/exams/student");

        setExams(res.data);

        const statusMap = {};

        for (const exam of res.data) {
          const statusRes = await API.get(`/submissions/check?exam=${exam._id}`);
          statusMap[exam._id] = statusRes.data.submitted;
        }

        setSubmittedExams(statusMap);
      } catch (error) {
        console.log(error);
        toast.error("Failed to load exams");
      }
    };

    fetchExams();
  }, [needsSubjectSelection]);

  const openExam = (exam) => {
    navigate("/exam", {
      state: { exam },
    });
  };

  const startExam = async (exam) => {
    try {
      const res = await API.get(`/submissions/check?exam=${exam._id}`);

      if (res.data.submitted) {
        toast.info("You already submitted this exam");
        return;
      }

      if (exam.createdRole === "admin") {
        setTokenExam(exam);
        setTokenEmail(user?.email || "");
        setExamToken("");
        return;
      }

      openExam(exam);
    } catch (error) {
      console.log(error);
      toast.error("Unable to start exam");
    }
  };

  const verifyTokenAndStart = async () => {
    if (!tokenExam) return;

    if (!tokenEmail.trim() || !examToken.trim()) {
      toast.error("Enter registered email and exam token");
      return;
    }

    try {
      setVerifyingToken(true);

      const res = await API.post("/exams/verify-token", {
        examId: tokenExam._id,
        email: tokenEmail,
        token: examToken,
      });

      if (res.data.verified) {
        toast.success("Token verified");

        const examToStart = tokenExam;

        setTokenExam(null);
        setExamToken("");

        openExam(examToStart);
      }

      setVerifyingToken(false);
    } catch (error) {
      console.log(error);
      setVerifyingToken(false);

      toast.error(error.response?.data?.message || "Token verification failed");
    }
  };

  const getExamStatus = (exam) => {
    const start = new Date(exam.startTime);
    const end = new Date(exam.endTime);

    if (submittedExams[exam._id]) return "submitted";
    if (now < start) return "not-started";
    if (now > end) return "ended";

    return "live";
  };

  const getCountdown = (exam) => {
    const start = new Date(exam.startTime);
    const diff = start - now;

    if (diff <= 0) return "Started";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;

    return `${seconds}s`;
  };

  const liveExams = exams.filter((exam) => getExamStatus(exam) === "live");

  const upcomingExams = exams.filter((exam) => {
    const status = getExamStatus(exam);
    return status === "live" || status === "not-started";
  });

  const submittedCount = Object.values(submittedExams).filter(Boolean).length;

  const upcomingCount = exams.filter(
    (exam) => getExamStatus(exam) === "not-started"
  ).length;

  if (needsSubjectSelection) {
    return null;
  }

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
          <a className="active" href="/student-dashboard">
            Dashboard
          </a>

          <a href="#upcoming-exams">Upcoming Exams</a>

          <a href="/student-history">Exam History</a>

          <a href="/student-results">Results</a>

          <a href="#profile">Profile</a>

          <button onClick={logout} className="modern-logout">
            Logout
          </button>
        </nav>
      </aside>

      <main className="modern-main">
        <header className="modern-topbar">
          <div className="topbar-left">
            <div>
              <h1>Welcome, {user?.name}</h1>
            </div>
          </div>

          <div className="topbar-right">
            <div className="notification-box">
              <span>Bell</span>

              {upcomingCount > 0 && <strong>{upcomingCount}</strong>}

              <div className="notification-dropdown">
                <h4>Notifications</h4>

                {upcomingCount === 0 ? (
                  <p>No upcoming exams.</p>
                ) : (
                  <p>
                    You have {upcomingCount} upcoming exam
                    {upcomingCount > 1 ? "s" : ""}.
                  </p>
                )}
              </div>
            </div>

            <div className="admin-profile">
              <label className="avatar upload-avatar">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || "S"
                )}

                <input
                  type="file"
                  accept="image/*"
                  onChange={updateProfileImage}
                />
              </label>

              <div>
                <h4>{user?.name || "Student"}</h4>
                <p>{user?.email}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="modern-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue-soft">S</div>

              <div>
                <h3>Stream</h3>
                <h2>{user?.stream || "N/A"}</h2>
                <p>Your registered stream</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green-soft">C</div>

              <div>
                <h3>Class</h3>
                <h2>{user?.classSemester || "N/A"}</h2>
                <p>Your class or semester</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange-soft">E</div>

              <div>
                <h3>Upcoming Exams</h3>
                <h2>{upcomingExams.length}</h2>
                <p className="up-text">{upcomingCount} scheduled exams</p>
              </div>

              <div className="mini-chart orange-chart"></div>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple-soft">R</div>

              <div>
                <h3>Submitted</h3>
                <h2>{submittedCount}</h2>
                <p>Completed exams</p>
              </div>

              <div className="mini-chart green-chart"></div>
            </div>
          </div>

          <div className="dashboard-two-col">
            <section className="modern-panel">
              <div className="panel-header">
                <h2>Current Status</h2>
              </div>

              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-icon blue">L</div>

                  <div>
                    <h4>{liveExams.length} live exams</h4>
                    <p>Exams currently available</p>
                  </div>

                  <span>Now</span>
                </div>

                <div className="activity-item">
                  <div className="activity-icon green">S</div>

                  <div>
                    <h4>{submittedCount} exams submitted</h4>
                    <p>Your completed exams</p>
                  </div>

                  <span>Now</span>
                </div>

                <div className="activity-item">
                  <div className="activity-icon orange">U</div>

                  <div>
                    <h4>{upcomingCount} upcoming exams</h4>
                    <p>Scheduled exams</p>
                  </div>

                  <span>Now</span>
                </div>
              </div>
            </section>

            <section id="profile" className="modern-panel">
              <div className="panel-header">
                <h2>Student Profile</h2>

                <a href="/student-results">
                  <button>View Results</button>
                </a>
              </div>

              <div className="profile-info-grid">
                <div>
                  <span>Name</span>
                  <strong>{user?.name || "N/A"}</strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{user?.email || "N/A"}</strong>
                </div>

                <div>
                  <span>Stream</span>
                  <strong>{user?.stream || "N/A"}</strong>
                </div>

                <div>
                  <span>Class</span>
                  <strong>{user?.classSemester || "N/A"}</strong>
                </div>

                <div>
                  <span>Department</span>
                  <strong>{user?.department || "N/A"}</strong>
                </div>

                <div>
                  <span>Major Subjects</span>
                  <strong>{formatSubjectList(user?.majorSubjects)}</strong>
                </div>

                <div>
                  <span>Minor Subjects</span>
                  <strong>{formatSubjectList(user?.minorSubjects)}</strong>
                </div>

                <div>
                  <span>Common Subjects</span>
                  <strong>{formatSubjectList(user?.commonSubjects)}</strong>
                </div>

                <div>
                  <span>Elective Subjects</span>
                  <strong>{formatSubjectList(user?.electiveSubjects)}</strong>
                </div>

                <div>
                  <span>Selected Subjects</span>
                  <strong>{formatSubjectList(user?.selectedSubjects)}</strong>
                </div>
              </div>
            </section>
          </div>

          <section id="upcoming-exams" className="modern-panel">
            <div className="panel-header">
              <h2>Upcoming Exams</h2>

              <a href="/student-history">
                <button>Exam History</button>
              </a>
            </div>

            {upcomingExams.length === 0 ? (
              <p className="empty-text">No upcoming or live exams found.</p>
            ) : (
              <div className="modern-table-wrap">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Subject</th>
                      <th>Type</th>
                      <th>Duration</th>
                      <th>Marks</th>
                      <th>Status</th>
                      <th>Starts In</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {upcomingExams.map((exam) => {
                      const status = getExamStatus(exam);

                      return (
                        <tr key={exam._id}>
                          <td>{exam.title}</td>
                          <td>{exam.subject}</td>

                          <td>
                            {exam.createdRole === "admin" ? (
                              <span className="status-pill pending">
                                Token Required
                              </span>
                            ) : (
                              <span className="status-pill active">
                                Normal
                              </span>
                            )}
                          </td>

                          <td>{exam.duration} min</td>
                          <td>{exam.totalMarks}</td>

                          <td>
                            <span
                              className={
                                status === "live"
                                  ? "status-pill active"
                                  : status === "not-started"
                                  ? "status-pill pending"
                                  : "status-pill danger"
                              }
                            >
                              {status}
                            </span>
                          </td>

                          <td>
                            {status === "not-started" ? getCountdown(exam) : "-"}
                          </td>

                          <td>
                            {status === "live" ? (
                              <button
                                className="approve-btn"
                                onClick={() => startExam(exam)}
                              >
                                Start
                              </button>
                            ) : (
                              <button disabled>{status}</button>
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

      {tokenExam && (
        <div className="submit-modal-overlay">
          <div className="submit-modal">
            <h2>Exam Token Required</h2>

            <p>
              This exam was created by admin. Enter your registered email and
              token sent to your mail.
            </p>

            <label>Registered Email</label>

            <input
              type="email"
              value={tokenEmail}
              onChange={(e) => setTokenEmail(e.target.value)}
              placeholder="Enter registered email"
            />

            <label>Exam Token</label>

            <input
              type="text"
              value={examToken}
              onChange={(e) => setExamToken(e.target.value.toUpperCase())}
              placeholder="Enter exam token"
            />

            <div className="submit-modal-actions">
              <button
                type="button"
                disabled={verifyingToken}
                onClick={verifyTokenAndStart}
              >
                {verifyingToken ? "Verifying..." : "Verify and Start"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setTokenExam(null);
                  setExamToken("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
