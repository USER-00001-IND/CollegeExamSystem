import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/proctor.css";

function ProctorLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = async () => {
    try {
      setLoading(true);

      const res = await API.get("/proctor/logs");

      setLogs(res.data);
      setLoading(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load proctor logs");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesType =
        selectedType === "all" || log.type === selectedType;

      const searchText = `${log.student?.name || ""} ${
        log.student?.email || ""
      } ${log.exam?.title || ""} ${log.message || ""}`.toLowerCase();

      return (
        matchesType &&
        searchText.includes(searchTerm.toLowerCase())
      );
    });
  }, [logs, selectedType, searchTerm]);

  const violationCount = logs.filter(
    (log) => log.type && log.type !== "snapshot"
  ).length;

  const snapshotCount = logs.filter(
    (log) => log.type === "snapshot" || log.image
  ).length;

  return (
    <div className="proctor-page">
      <aside className="proctor-sidebar">
        <h2>Faculty Panel</h2>

        <nav>
          <a href="/faculty-dashboard">Dashboard</a>
          <a href="/create-test">Create Test</a>
          <a href="/manage-exams">Manage Exams</a>
          <a href="/results">Results</a>
          <a className="active" href="/proctor-logs">
            Proctor Logs
          </a>
        </nav>
      </aside>

      <main className="proctor-main">
        <header className="proctor-header">
          <div>
            <h1>Proctor Logs</h1>
            <p>Snapshots, violations, and suspicious activity</p>
          </div>

          <button onClick={fetchLogs}>Refresh</button>
        </header>

        <div className="proctor-stats">
          <div className="proctor-stat-card">
            <span>Total Logs</span>
            <strong>{logs.length}</strong>
          </div>

          <div className="proctor-stat-card">
            <span>Snapshots</span>
            <strong>{snapshotCount}</strong>
          </div>

          <div className="proctor-stat-card danger">
            <span>Violations</span>
            <strong>{violationCount}</strong>
          </div>
        </div>

        <div className="proctor-filters">
          <input
            type="text"
            placeholder="Search by student, email, exam, message"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">All Logs</option>
            <option value="snapshot">Snapshots</option>
            <option value="tab-switch">Tab Switch</option>
            <option value="fullscreen-exit">Fullscreen Exit</option>
            <option value="back-navigation">Back Navigation</option>
            <option value="page-refresh">Page Refresh</option>
            <option value="auto-submit">Auto Submit</option>
          </select>
        </div>

        {loading ? (
          <div className="proctor-loader">Loading proctor logs...</div>
        ) : filteredLogs.length === 0 ? (
          <p className="proctor-empty">No proctor logs found.</p>
        ) : (
          <div className="proctor-grid">
            {filteredLogs.map((log) => (
              <div
                className={
                  log.type === "snapshot"
                    ? "proctor-card"
                    : "proctor-card violation"
                }
                key={log._id}
              >
                <div className="proctor-card-top">
                  <span
                    className={
                      log.type === "snapshot"
                        ? "log-badge snapshot"
                        : "log-badge violation"
                    }
                  >
                    {log.type || "snapshot"}
                  </span>

                  <small>
                    {new Date(
                      log.capturedAt || log.createdAt
                    ).toLocaleString()}
                  </small>
                </div>

                <h3>{log.exam?.title || "Unknown Exam"}</h3>

                <p>
                  <strong>Student:</strong>{" "}
                  {log.student?.name || "Unknown"}
                </p>

                <p>
                  <strong>Email:</strong>{" "}
                  {log.student?.email || "N/A"}
                </p>

                <p>
                  <strong>Message:</strong>{" "}
                  {log.message || "Camera snapshot captured"}
                </p>

                {log.image && (
                  <img
                    className="proctor-image"
                    src={log.image}
                    alt="Proctor snapshot"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ProctorLogs;