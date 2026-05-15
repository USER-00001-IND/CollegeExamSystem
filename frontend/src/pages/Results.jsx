import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function Results() {
  const [submissions, setSubmissions] = useState([]);
  const [studentResults, setStudentResults] = useState([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [questionMarks, setQuestionMarks] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchResults = async () => {
    try {
      setLoading(true);

      const res = await API.get("/submissions");

      setSubmissions(res.data);
      setLoading(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load results");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const classes = useMemo(() => {
    const list = submissions
      .map((item) => item.exam?.classSemester)
      .filter(Boolean);

    return [...new Set(list)];
  }, [submissions]);

  const examsByClass = useMemo(() => {
    const map = new Map();

    submissions
      .filter((item) => item.exam?.classSemester === selectedClass)
      .forEach((item) => {
        if (item.exam?._id) {
          map.set(item.exam._id, item.exam);
        }
      });

    return Array.from(map.values());
  }, [submissions, selectedClass]);

  const filteredStudentResults = studentResults.filter((item) =>
    `${item.studentName} ${item.email} ${item.stream} ${item.classSemester}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const loadStudentResults = async () => {
    if (!selectedClass || !selectedExam) {
      toast.error("Select class and exam");
      return;
    }

    try {
      setViewLoading(true);

      const res = await API.get(
        `/submissions/faculty-class-results?classSemester=${encodeURIComponent(
          selectedClass
        )}&examId=${selectedExam}`
      );

      setStudentResults(res.data);
      setViewLoading(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load student results");
      setViewLoading(false);
    }
  };

  const exportCSV = () => {
    if (filteredStudentResults.length === 0) {
      toast.error("No results to export");
      return;
    }

    const headers = [
      "SL",
      "Name",
      "Stream",
      "Class",
      "Email",
      "Subject",
      "Score",
      "Total Marks",
      "Status",
      "Submitted At",
    ];

    const rows = filteredStudentResults.map((item, index) => [
      index + 1,
      item.studentName || "",
      item.stream || "",
      item.classSemester || "",
      item.email || "",
      item.subject || "",
      item.score || 0,
      item.totalMarks || 0,
      item.status || "",
      item.submittedAt
        ? new Date(item.submittedAt).toLocaleString()
        : "Absent",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((value) => `"${value}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "exam-results.csv";
    link.click();

    URL.revokeObjectURL(url);

    toast.success("CSV exported successfully");
  };

  const saveScore = async (id) => {
    try {
      await API.put(`/marking/score/${id}`, {
        answers: questionMarks,
      });

      toast.success("Marks updated successfully");

      setSelectedSubmission(null);
      setQuestionMarks([]);

      await fetchResults();
      await loadStudentResults();
    } catch (error) {
      console.log(error);

      toast.error(
        error.response?.data?.message || "Score update failed"
      );
    }
  };

  const openSubmissionForReview = async (row) => {
    if (row.status === "Absent") {
      toast.info("Student was absent. No answer sheet found.");
      return;
    }

    const fullSubmission = submissions.find(
      (item) => item._id === row._id
    );

    if (!fullSubmission) {
      toast.error("Answer sheet not found. Refresh results.");
      return;
    }

    setSelectedSubmission(fullSubmission);

    setQuestionMarks(
      fullSubmission.answers.map((answer) => ({
        questionIndex: answer.questionIndex,
        obtainedMarks: answer.obtainedMarks || 0,
      }))
    );
  };

  const updateQuestionMark = (questionIndex, value, maxMarks) => {
    let marks = Number(value);

    if (Number.isNaN(marks)) marks = 0;
    if (marks < 0) marks = 0;
    if (marks > maxMarks) marks = maxMarks;

    setQuestionMarks((prev) =>
      prev.map((item) =>
        item.questionIndex === questionIndex
          ? {
              ...item,
              obtainedMarks: marks,
            }
          : item
      )
    );
  };

  const calculatedTotal = questionMarks.reduce(
    (total, item) => total + Number(item.obtainedMarks || 0),
    0
  );

  return (
    <div className="dashboard-page">
      <aside className="sidebar faculty-sidebar">
        <h2>Faculty Panel</h2>

        <nav>
          <a href="/faculty-dashboard">Dashboard</a>
          <a href="/create-test">Create Test</a>
          <a href="/manage-exams">Manage Exams</a>
          <a href="/results">Results</a>
          <a href="/proctor-logs">Proctor Logs</a>
        </nav>
      </aside>

      <main className="dashboard-main">
        <h1>Exam Results</h1>

        <div className="create-test-form result-filter-box">
          <h2>Filter Results</h2>

          <label>Select Class</label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedExam("");
              setSelectedSubject("");
              setSelectedSubmission(null);
              setStudentResults([]);
            }}
          >
            <option value="">Select Class</option>

            {classes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <label>Select Exam</label>
          <select
            value={selectedExam}
            disabled={!selectedClass}
            onChange={(e) => {
              const examId = e.target.value;
              const exam = examsByClass.find(
                (item) => item._id === examId
              );

              setSelectedExam(examId);
              setSelectedSubject(exam?.subject || "");
              setSelectedSubmission(null);
              setStudentResults([]);
            }}
          >
            <option value="">Select Exam</option>

            {examsByClass.map((exam) => (
              <option key={exam._id} value={exam._id}>
                {exam.title} - {exam.subject}
              </option>
            ))}
          </select>

          <label>Subject</label>
          <input
            type="text"
            value={selectedSubject}
            placeholder="Subject"
            readOnly
          />

          <label>Search Student</label>
          <input
            type="text"
            placeholder="Search student name, email, stream, class"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <button type="button" onClick={loadStudentResults}>
            View Students
          </button>

          <button type="button" onClick={exportCSV}>
            Export CSV
          </button>
        </div>

        {loading ? (
          <div className="modern-loader">Loading results...</div>
        ) : (
          <>
            {selectedSubmission && (
              <div className="create-test-form">
                <h2>Review Answers</h2>

                <p>Student: {selectedSubmission.student?.name}</p>
                <p>Email: {selectedSubmission.student?.email}</p>
                <p>Class: {selectedSubmission.exam?.classSemester}</p>
                <p>Exam: {selectedSubmission.exam?.title}</p>
                <p>Subject: {selectedSubmission.exam?.subject}</p>

                <h3>
                  Total Score: {calculatedTotal} /{" "}
                  {selectedSubmission.exam?.totalMarks}
                </h3>

                {selectedSubmission.answers?.map((answer) => {
                  const question =
                    selectedSubmission.exam?.questions?.[
                      answer.questionIndex
                    ];

                  const currentMark =
                    questionMarks.find(
                      (item) =>
                        item.questionIndex === answer.questionIndex
                    )?.obtainedMarks || 0;

                  const isMCQCorrect =
                    String(answer.answer || "").trim().toLowerCase() ===
                    String(question?.correctAnswer || "")
                      .trim()
                      .toLowerCase();

                  return (
                    <div
                      className="question-box"
                      key={answer.questionIndex}
                    >
                      <h3>Question {answer.questionIndex + 1}</h3>

                      <p>{question?.questionText}</p>

                      <p>Type: {question?.type}</p>

                      <p>
                        Student Answer:{" "}
                        {answer.answer || "Not answered"}
                      </p>

                      {question?.type === "mcq" && (
                        <>
                          <p>
                            Correct Answer: {question.correctAnswer}
                          </p>

                          <p>
                            Result:{" "}
                            {isMCQCorrect ? "Correct" : "Wrong"}
                          </p>
                        </>
                      )}

                      <p>Max Marks: {question?.marks}</p>

                      <p>
                        Current Marks: {currentMark} / {question?.marks}
                      </p>

                      <p>
                        Status:{" "}
                        {answer.isChecked ? "Checked" : "Unchecked"}
                      </p>

                      <div className="manual-mark-box">
                        <label>Obtained Marks</label>

                        <input
                          type="number"
                          min="0"
                          max={question?.marks || 0}
                          value={currentMark}
                          disabled={question?.type === "mcq"}
                          onChange={(e) =>
                            updateQuestionMark(
                              answer.questionIndex,
                              e.target.value,
                              question?.marks || 0
                            )
                          }
                        />

                        {question?.type === "mcq" && (
                          <small className="auto-check-label">
                            MCQ marks are auto checked
                          </small>
                        )}
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={() => saveScore(selectedSubmission._id)}
                >
                  Save Marks
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubmission(null);
                    setQuestionMarks([]);
                  }}
                >
                  Close
                </button>
              </div>
            )}

            {!selectedClass ? (
              <p className="empty-text">
                Select a class to view exams.
              </p>
            ) : !selectedExam ? (
              <p className="empty-text">
                Select an exam to view student list.
              </p>
            ) : viewLoading ? (
              <div className="modern-loader">
                Loading student list...
              </div>
            ) : filteredStudentResults.length === 0 ? (
              <p className="empty-text">
                Click View Students to load submitted and absent students.
              </p>
            ) : (
              <div className="result-table">
                <table>
                  <thead>
                    <tr>
                      <th>SL</th>
                      <th>Name</th>
                      <th>Stream</th>
                      <th>Class</th>
                      <th>Email</th>
                      <th>Subject</th>
                      <th>Score</th>
                      <th>Total Marks</th>
                      <th>Status</th>
                      <th>Submitted At</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudentResults.map((item, index) => (
                      <tr key={item._id}>
                        <td>{index + 1}</td>
                        <td>{item.studentName}</td>
                        <td>{item.stream}</td>
                        <td>{item.classSemester}</td>
                        <td>{item.email}</td>
                        <td>{item.subject}</td>
                        <td>{item.score}</td>
                        <td>{item.totalMarks}</td>
                        <td>
                          <span
                            className={
                              item.status === "Evaluated"
                                ? "status-pill active"
                                : item.status === "Pending Evaluation"
                                ? "status-pill pending"
                                : "status-pill danger"
                            }
                          >
                            {item.status}
                          </span>
                        </td>
                        <td>
                          {item.submittedAt
                            ? new Date(
                                item.submittedAt
                              ).toLocaleString()
                            : "Absent"}
                        </td>
                        <td>
                          <button
                            disabled={item.status === "Absent"}
                            onClick={() =>
                              openSubmissionForReview(item)
                            }
                          >
                            {item.status === "Absent"
                              ? "Absent"
                              : "Review / Mark"}
                          </button>
                        </td>
                      </tr>
                    ))}
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

export default Results;