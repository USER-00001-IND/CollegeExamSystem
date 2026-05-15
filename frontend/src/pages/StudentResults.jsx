import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function StudentResults() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [results, setResults] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [scoreCard, setScoreCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);

        const res = await API.get("/submissions/my-results");

        setResults(res.data);
        setLoading(false);
      } catch (error) {
        console.log(error);
        toast.error("Failed to load results");
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  const subjects = useMemo(() => {
    const list = results
      .map((item) => item.exam?.subject)
      .filter(Boolean);

    return [...new Set(list)];
  }, [results]);

  const examsBySubject = useMemo(() => {
    return results.filter(
      (item) => item.exam?.subject === selectedSubject
    );
  }, [results, selectedSubject]);

  const evaluatedCount = results.filter((item) => item.evaluated).length;
  const pendingCount = results.filter((item) => !item.evaluated).length;

  const viewScoreCard = async () => {
    if (!selectedSubject || !selectedExam) {
      toast.error("Select subject and exam");
      return;
    }

    try {
      const res = await API.get(
        `/submissions/student-scorecard?subject=${selectedSubject}&examId=${selectedExam}`
      );

      setScoreCard(res.data);
      setShowDetails(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load score card");
    }
  };

  const getQuestion = (answer) => {
    return scoreCard?.submission?.exam?.questions?.[answer.questionIndex];
  };

  const downloadAnswerKey = () => {
    if (!scoreCard || scoreCard.underEvaluation) {
      toast.error("Answer key is available only after evaluation");
      return;
    }

    const rows = scoreCard.submission?.answers || [];

    let content = "SCORE CARD AND ANSWER KEY\n\n";

    content += `Student: ${user?.name || "Student"}\n`;
    content += `Exam: ${scoreCard.submission?.exam?.title || "N/A"}\n`;
    content += `Subject: ${scoreCard.submission?.exam?.subject || "N/A"}\n`;
    content += `Score: ${scoreCard.score}/${scoreCard.totalMarks}\n`;
    content += `Status: ${scoreCard.status}\n`;
    content += `Faculty: ${scoreCard.submission?.evaluatedBy?.name || "N/A"}\n`;
    content += `Evaluated At: ${
      scoreCard.submission?.evaluatedAt
        ? new Date(scoreCard.submission.evaluatedAt).toLocaleString()
        : "N/A"
    }\n\n`;

    content += "ANSWER KEY\n\n";

    rows.forEach((answer) => {
      const question = getQuestion(answer);

      content += `Question ${answer.questionIndex + 1}\n`;
      content += `Type: ${question?.type || "N/A"}\n`;
      content += `Question: ${question?.questionText || "N/A"}\n`;
      content += `Your Answer: ${answer.answer || "Not answered"}\n`;

      if (question?.type === "mcq") {
        content += `Correct Answer: ${question.correctAnswer || "N/A"}\n`;
      }

      content += `Marks: ${answer.obtainedMarks || 0}/${question?.marks || 0}\n`;
      content += `Checked: ${answer.isChecked ? "Yes" : "No"}\n\n`;
    });

    const blob = new Blob([content], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "answer-key.txt";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <div className="modern-dashboard result-certificate-page">
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

          <a className="active" href="/student-results">
            Results
          </a>

          <button onClick={logout} className="modern-logout">
            Logout
          </button>
        </nav>
      </aside>

      <main className="modern-main">
        <header className="modern-topbar">
          <div className="topbar-left">
            <div>
              <h1>Result</h1>
              <p>Score card and answer key</p>
            </div>
          </div>

          <div className="topbar-right">
            <div className="admin-profile">
              <div className="avatar">
                {user?.name?.charAt(0)?.toUpperCase() || "S"}
              </div>

              <div>
                <h4>{user?.name || "Student"}</h4>
                <p>{user?.email}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="modern-content">
          {loading ? (
            <div className="modern-loader">Loading results...</div>
          ) : (
            <>
              <div className="result-mini-stats">
                <div>
                  <span>Total</span>
                  <strong>{results.length}</strong>
                </div>

                <div>
                  <span>Evaluated</span>
                  <strong>{evaluatedCount}</strong>
                </div>

                <div>
                  <span>Pending</span>
                  <strong>{pendingCount}</strong>
                </div>
              </div>

              <section className="modern-panel result-select-panel">
                <h2>Select Result</h2>

                <div className="result-select-grid">
                  <div>
                    <label>Subject</label>

                    <select
                      value={selectedSubject}
                      onChange={(e) => {
                        setSelectedSubject(e.target.value);
                        setSelectedExam("");
                        setScoreCard(null);
                      }}
                    >
                      <option value="">Select Subject</option>

                      {subjects.map((subject) => (
                        <option key={subject} value={subject}>
                          {subject}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Exam</label>

                    <select
                      value={selectedExam}
                      disabled={!selectedSubject}
                      onChange={(e) => {
                        setSelectedExam(e.target.value);
                        setScoreCard(null);
                      }}
                    >
                      <option value="">Select Exam</option>

                      {examsBySubject.map((item) => (
                        <option key={item.exam?._id} value={item.exam?._id}>
                          {item.exam?.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button type="button" onClick={viewScoreCard}>
                    View
                  </button>
                </div>
              </section>

              {scoreCard && (
                <>
                  <section className="score-certificate">
                    <div className="certificate-head">
                      <p>College Exam System</p>
                      <h2>Score Card</h2>
                    </div>

                    <div className="certificate-info">
                      <div>
                        <span>Student</span>
                        <strong>{user?.name || "Student"}</strong>
                      </div>

                      <div>
                        <span>Exam</span>
                        <strong>
                          {scoreCard.submission?.exam?.title ||
                            scoreCard.exam?.title ||
                            "N/A"}
                        </strong>
                      </div>

                      <div>
                        <span>Subject</span>
                        <strong>
                          {scoreCard.submission?.exam?.subject ||
                            scoreCard.subject ||
                            "N/A"}
                        </strong>
                      </div>

                      <div>
                        <span>Faculty</span>
                        <strong>
                          {scoreCard.underEvaluation
                            ? "Pending"
                            : scoreCard.submission?.evaluatedBy?.name || "N/A"}
                        </strong>
                      </div>

                      <div>
                        <span>Time</span>
                        <strong>
                          {scoreCard.underEvaluation
                            ? "Pending"
                            : scoreCard.submission?.evaluatedAt
                            ? new Date(
                                scoreCard.submission.evaluatedAt
                              ).toLocaleString()
                            : "N/A"}
                        </strong>
                      </div>
                    </div>

                    {scoreCard.underEvaluation ? (
                      <div className="under-evaluation-card">
                        <h3>Under Evaluation</h3>
                        <p>
                          Your exam was submitted successfully. The score card
                          and answer key will unlock after faculty evaluation.
                        </p>
                      </div>
                    ) : (
                      <div className="certificate-score">
                        <span>Score</span>
                        <strong>
                          {scoreCard.score} / {scoreCard.totalMarks}
                        </strong>

                        <em
                          className={
                            scoreCard.status === "Pass"
                              ? "status-pass"
                              : "status-fail"
                          }
                        >
                          {scoreCard.status}
                        </em>
                      </div>
                    )}
                  </section>

                  {!scoreCard.underEvaluation && !scoreCard.absent && (
                    <section className="modern-panel answer-key-panel">
                      <div className="panel-header">
                        <h2>Answer Key</h2>

                        <div className="result-action-buttons">
                          <button
                            type="button"
                            onClick={() => setShowDetails(!showDetails)}
                          >
                            {showDetails
                              ? "Hide Detailed Answer Key"
                              : "View Detailed Answer Key"}
                          </button>

                          <button type="button" onClick={downloadAnswerKey}>
                            Download Answer Key
                          </button>
                        </div>
                      </div>

                      <div className="modern-table-wrap">
                        <table className="modern-table answer-key-table">
                          <thead>
                            <tr>
                              <th>Q No.</th>
                              <th>Type</th>
                              <th>Marks Obtained</th>
                              <th>Marks</th>
                              <th>Faculty</th>
                              <th>Time</th>
                              <th>Status</th>
                            </tr>
                          </thead>

                          <tbody>
                            {scoreCard.submission?.answers?.map((answer) => {
                              const question = getQuestion(answer);

                              return (
                                <tr key={answer.questionIndex}>
                                  <td>{answer.questionIndex + 1}</td>
                                  <td>{question?.type || "N/A"}</td>
                                  <td>{answer.obtainedMarks || 0}</td>
                                  <td>{question?.marks || 0}</td>
                                  <td>
                                    {scoreCard.submission?.evaluatedBy?.name ||
                                      "N/A"}
                                  </td>
                                  <td>
                                    {scoreCard.submission?.evaluatedAt
                                      ? new Date(
                                          scoreCard.submission.evaluatedAt
                                        ).toLocaleString()
                                      : "N/A"}
                                  </td>
                                  <td>
                                    <span
                                      className={
                                        answer.isChecked
                                          ? "status-pill active"
                                          : "status-pill pending"
                                      }
                                    >
                                      {answer.isChecked ? "Checked" : "Pending"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {showDetails && (
                        <div className="detailed-answer-list">
                          {scoreCard.submission?.answers?.map((answer) => {
                            const question = getQuestion(answer);

                            return (
                              <div
                                className="detail-answer-card"
                                key={answer.questionIndex}
                              >
                                <h3>Question {answer.questionIndex + 1}</h3>

                                <p>
                                  <strong>Question:</strong>{" "}
                                  {question?.questionText || "N/A"}
                                </p>

                                <p>
                                  <strong>Your Answer:</strong>{" "}
                                  {answer.answer || "Not answered"}
                                </p>

                                {question?.type === "mcq" && (
                                  <p>
                                    <strong>Correct Answer:</strong>{" "}
                                    {question.correctAnswer || "N/A"}
                                  </p>
                                )}

                                <p>
                                  <strong>Marks:</strong>{" "}
                                  {answer.obtainedMarks || 0} /{" "}
                                  {question?.marks || 0}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default StudentResults;