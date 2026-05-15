import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import API from "../services/api";
import "../styles/dashboard.css";

function AssignedPapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchPapers = async () => {
    try {
      const res = await API.get(
        "/marking/assigned-papers"
      );

      setPapers(res.data);
    } catch (error) {
      console.log(error);

      toast.error("Failed to load papers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  return (
    <div className="dashboard-page">
      <aside className="sidebar faculty-sidebar">
        <h2>Faculty Panel</h2>

        <nav>
          <a href="/faculty-dashboard">
            Dashboard
          </a>

          <a href="/assigned-papers">
            Assigned Papers
          </a>

          <a href="/results">
            Results
          </a>
        </nav>
      </aside>

      <main className="dashboard-main">
        <h1>Assigned Papers</h1>

        {loading ? (
          <div className="modern-loader">
            Loading papers...
          </div>
        ) : papers.length === 0 ? (
          <p className="empty-text">
            No assigned papers found.
          </p>
        ) : (
          <div className="modern-table-wrap">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>SL</th>
                  <th>Paper ID</th>
                  <th>Exam</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {papers.map((paper, index) => (
                  <tr key={paper._id}>
                    <td>{index + 1}</td>

                    <td>
                      {paper.paperId}
                    </td>

                    <td>
                      {paper.exam?.title}
                    </td>

                    <td>
                      {paper.exam?.subject}
                    </td>

                    <td>
                      <span
                        className={
                          paper.evaluated
                            ? "status-pill active"
                            : "status-pill pending"
                        }
                      >
                        {paper.evaluated
                          ? "Evaluated"
                          : "Pending"}
                      </span>
                    </td>

                    <td>
                      {new Date(
                        paper.submittedAt
                      ).toLocaleString()}
                    </td>

                    <td>
                      <button
                        onClick={() =>
                          navigate(
                            `/evaluate-paper/${paper._id}`
                          )
                        }
                      >
                        Evaluate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default AssignedPapers;