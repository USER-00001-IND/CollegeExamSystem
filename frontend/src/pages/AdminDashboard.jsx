import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedClass, setSelectedClass] = useState("");
  const [reports, setReports] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const facultyRes = await API.get("/admin/faculty");
      const studentRes = await API.get("/admin/students");

      setFaculty(facultyRes.data);
      setStudents(studentRes.data);
      setLoading(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load users");
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);

      const res = await API.get("/audit");

      setAuditLogs(res.data);
      setAuditLoading(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load audit logs");
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
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

  const approveFaculty = async (id) => {
    try {
      await API.put(`/admin/approve-faculty/${id}`);

      toast.success("Faculty approved");

      fetchUsers();
      fetchAuditLogs();
    } catch (error) {
      console.log(error);
      toast.error("Approval failed");
    }
  };

  const verifyUserEmail = async (id) => {
    try {
      await API.put(`/admin/verify-user-email/${id}`);

      toast.success("Email verified");

      fetchUsers();
      fetchAuditLogs();
    } catch (error) {
      console.log(error);

      toast.error(error.response?.data?.message || "Email verification failed");
    }
  };

  const toggleBlockUser = async (id) => {
    try {
      const res = await API.put(`/admin/toggle-block-user/${id}`);

      toast.success(res.data.message);

      fetchUsers();
      fetchAuditLogs();
    } catch (error) {
      console.log(error);

      toast.error(error.response?.data?.message || "Status update failed");
    }
  };

  const forceLogoutUser = async (id) => {
    const confirmLogout = window.confirm(
      "Force logout this user from all devices?"
    );

    if (!confirmLogout) return;

    try {
      const res = await API.put(`/admin/force-logout-user/${id}`);

      toast.success(res.data.message);

      fetchUsers();
      fetchAuditLogs();
    } catch (error) {
      console.log(error);

      toast.error(error.response?.data?.message || "Force logout failed");
    }
  };

  const deleteUser = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/admin/user/${id}`);

      toast.success("User deleted");

      fetchUsers();
      fetchAuditLogs();
    } catch (error) {
      console.log(error);
      toast.error("Delete failed");
    }
  };

  const fetchReports = async () => {
    if (!selectedClass) {
      toast.error("Select class");
      return;
    }

    try {
      setReportLoading(true);

      const res = await API.get(
        `/admin/reports?classSemester=${encodeURIComponent(selectedClass)}`
      );

      setReports(res.data);
      setReportLoading(false);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load reports");
      setReportLoading(false);
    }
  };

  const cleanCSVValue = (value) => {
    if (value === null || value === undefined) return "";

    return `"${String(value).replace(/"/g, '""')}"`;
  };

  const exportReportsCSV = () => {
    if (reports.length === 0) {
      toast.error("No report data available");
      return;
    }

    const headers = [
      "Name",
      "Class",
      "Email",
      "Exams Attempted",
      "Total Exams",
      "Performance",
      "Status",
    ];

    const rows = reports.map((student) => [
      student.name,
      student.classSemester,
      student.email,
      student.examsAttempted,
      student.totalExams,
      `${student.performance}%`,
      student.status,
    ]);

    const csvContent = [
      headers.map(cleanCSVValue).join(","),
      ...rows.map((row) => row.map(cleanCSVValue).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;

    link.setAttribute(
      "download",
      `class-report-${selectedClass || "all"}.csv`
    );

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const pendingFaculty = faculty.filter((item) => !item.isApproved);

  const classList = [
    ...new Set(students.map((item) => item.classSemester).filter(Boolean)),
  ];

  const recentActivity = [
    {
      title: "Faculty accounts loaded",
      text: `${faculty.length} faculty account found`,
      time: "Now",
      color: "blue",
      letter: "F",
    },
    {
      title: "Students loaded",
      text: `${students.length} student account found`,
      time: "Now",
      color: "green",
      letter: "S",
    },
    {
      title: "Pending faculty approvals",
      text: `${pendingFaculty.length} faculty waiting for approval`,
      time: "Now",
      color: "orange",
      letter: "P",
    },
    {
      title: "Audit logs",
      text: `${auditLogs.length} recent activity logs`,
      time: "Now",
      color: "purple",
      letter: "A",
    },
  ];

  return (
    <div className="modern-dashboard">
      <aside className="modern-sidebar">
        <div className="brand-box">
          <div className="brand-icon">A</div>

          <div>
            <h2>Exam System</h2>
            <p>Admin Panel</p>
          </div>
        </div>

        <nav className="modern-nav">
          <a className="active" href="/admin-dashboard">
            Dashboard
          </a>
          
          <a href="/academics-management">
            Academics Management
          </a>
          
          <a href="#faculty">
            Faculty Management
          </a>
          
          <a href="#students">
            Student Management
          </a>
          
          <a href="#reports">
            Reports
          </a>
          
          <a href="#audit">
            Audit Logs
          </a>
          
          <a href="/live-exams">
            Live Exam
          </a>
          
          <a href="/admin-exams">
            Admin Exams
          </a>
          
          <a href="/create-admin-exam">
            Create Admin Exam
          </a>
          <a href="/admin-result-workflow">
            Result Workflow
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
            <h1>Dashboard</h1>
          </div>

          <div className="topbar-right">
            <div className="admin-profile">
              <div className="avatar">A</div>

              <div>
                <h4>{user?.name || "Admin"}</h4>
                <p>{user?.email}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="modern-content">
          {loading ? (
            <div className="modern-loader">Loading dashboard...</div>
          ) : (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon blue-soft">F</div>

                  <div>
                    <h3>Total Faculty</h3>
                    <h2>{faculty.length}</h2>
                    <p className="up-text">Active faculty accounts</p>
                  </div>

                  <div className="mini-chart blue-chart"></div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orange-soft">P</div>

                  <div>
                    <h3>Pending Faculty</h3>
                    <h2>{pendingFaculty.length}</h2>
                    <p className="down-text">Waiting approval</p>
                  </div>

                  <div className="mini-chart orange-chart"></div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon green-soft">S</div>

                  <div>
                    <h3>Total Students</h3>
                    <h2>{students.length}</h2>
                    <p className="up-text">Registered students</p>
                  </div>

                  <div className="mini-chart green-chart"></div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon purple-soft">A</div>

                  <div>
                    <h3>Audit Logs</h3>
                    <h2>{auditLogs.length}</h2>
                    <p>Recent system actions</p>
                    <span className="role-pill">Admin Monitor</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-two-col">
                <section className="modern-panel">
                  <div className="panel-header">
                    <h2>Recent Activity</h2>

                    <a href="#audit">
                      <button>View Audit</button>
                    </a>
                  </div>

                  <div className="activity-list">
                    {recentActivity.map((item, index) => (
                      <div className="activity-item" key={index}>
                        <div className={`activity-icon ${item.color}`}>
                          {item.letter}
                        </div>

                        <div>
                          <h4>{item.title}</h4>
                          <p>{item.text}</p>
                        </div>

                        <span>{item.time}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="modern-panel">
                  <div className="panel-header">
                    <h2>Quick Actions</h2>
                  </div>

                  <div className="quick-grid">
                    <a href="#faculty" className="quick-card">
                      <span className="quick-icon blue-soft">F</span>
                      Faculty
                    </a>

                    <a href="#students" className="quick-card">
                      <span className="quick-icon green-soft">S</span>
                      Students
                    </a>

                    <a href="#reports" className="quick-card">
                      <span className="quick-icon orange-soft">R</span>
                      Reports
                    </a>

                    <a href="#audit" className="quick-card">
                      <span className="quick-icon purple-soft">A</span>
                      Audit
                    </a>

                    <a href="/live-exams" className="quick-card">
                      <span className="quick-icon purple-soft">L</span>
                      Live Exam
                    </a>
                  </div>
                </section>
              </div>

              <section id="faculty" className="modern-panel">
                <div className="panel-header">
                  <h2>Faculty Management</h2>
                </div>

                {faculty.length === 0 ? (
                  <p className="empty-text">No faculty accounts found.</p>
                ) : (
                  <div className="modern-table-wrap">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>SL</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Approval</th>
                          <th>Email</th>
                          <th>Account</th>
                          <th>Last Login</th>
                          <th>Device</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {faculty.map((item, index) => (
                          <tr key={item._id}>
                            <td>{index + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.email}</td>
                            <td>{item.phone || "N/A"}</td>

                            <td>
                              <span
                                className={
                                  item.isApproved
                                    ? "status-pill active"
                                    : "status-pill pending"
                                }
                              >
                                {item.isApproved ? "Approved" : "Pending"}
                              </span>
                            </td>

                            <td>
                              <span
                                className={
                                  item.isEmailVerified
                                    ? "status-pill active"
                                    : "status-pill pending"
                                }
                              >
                                {item.isEmailVerified
                                  ? "Verified"
                                  : "Not Verified"}
                              </span>
                            </td>

                            <td>
                              <span
                                className={
                                  item.isBlocked
                                    ? "status-pill danger"
                                    : "status-pill active"
                                }
                              >
                                {item.isBlocked ? "Blocked" : "Active"}
                              </span>
                            </td>

                            <td>
                              {item.lastLoginAt
                                ? new Date(item.lastLoginAt).toLocaleString()
                                : "Never"}
                            </td>

                            <td>{item.lastLoginDevice || "N/A"}</td>

                            <td>
                              <div className="table-actions">
                                {!item.isApproved && (
                                  <button
                                    className="approve-btn"
                                    onClick={() => approveFaculty(item._id)}
                                  >
                                    Approve
                                  </button>
                                )}

                                {!item.isEmailVerified && (
                                  <button
                                    type="button"
                                    onClick={() => verifyUserEmail(item._id)}
                                  >
                                    Verify Email
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => forceLogoutUser(item._id)}
                                >
                                  Force Logout
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleBlockUser(item._id)}
                                >
                                  {item.isBlocked ? "Unblock" : "Block"}
                                </button>

                                <button
                                  className="small-delete-btn"
                                  onClick={() => deleteUser(item._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section id="students" className="modern-panel">
                <div className="panel-header">
                  <h2>Student Management</h2>
                </div>

                {students.length === 0 ? (
                  <p className="empty-text">No student accounts found.</p>
                ) : (
                  <div className="modern-table-wrap">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>SL</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Stream</th>
                          <th>Class</th>
                          <th>Email</th>
                          <th>Account</th>
                          <th>Last Login</th>
                          <th>Device</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {students.map((item, index) => (
                          <tr key={item._id}>
                            <td>{index + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.email}</td>
                            <td>{item.phone || "N/A"}</td>
                            <td>{item.stream || "N/A"}</td>
                            <td>{item.classSemester || "N/A"}</td>

                            <td>
                              <span
                                className={
                                  item.isEmailVerified
                                    ? "status-pill active"
                                    : "status-pill pending"
                                }
                              >
                                {item.isEmailVerified
                                  ? "Verified"
                                  : "Not Verified"}
                              </span>
                            </td>

                            <td>
                              <span
                                className={
                                  item.isBlocked
                                    ? "status-pill danger"
                                    : "status-pill active"
                                }
                              >
                                {item.isBlocked ? "Blocked" : "Active"}
                              </span>
                            </td>

                            <td>
                              {item.lastLoginAt
                                ? new Date(item.lastLoginAt).toLocaleString()
                                : "Never"}
                            </td>

                            <td>{item.lastLoginDevice || "N/A"}</td>

                            <td>
                              <div className="table-actions">
                                {!item.isEmailVerified && (
                                  <button
                                    type="button"
                                    onClick={() => verifyUserEmail(item._id)}
                                  >
                                    Verify Email
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => forceLogoutUser(item._id)}
                                >
                                  Force Logout
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleBlockUser(item._id)}
                                >
                                  {item.isBlocked ? "Unblock" : "Block"}
                                </button>

                                <button
                                  className="small-delete-btn"
                                  onClick={() => deleteUser(item._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section id="reports" className="modern-panel">
                <div className="panel-header">
                  <h2>Class Reports</h2>

                  <button type="button" onClick={exportReportsCSV}>
                    Export CSV
                  </button>
                </div>

                <div className="create-test-form">
                  <label>Select Class</label>

                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value);
                      setReports([]);
                    }}
                  >
                    <option value="">Select Class</option>

                    {classList.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  <button type="button" onClick={fetchReports}>
                    View Report
                  </button>
                </div>

                {reportLoading ? (
                  <div className="modern-loader">Loading reports...</div>
                ) : reports.length === 0 ? (
                  <p className="empty-text">No report data available.</p>
                ) : (
                  <div className="modern-table-wrap">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>SL</th>
                          <th>Name</th>
                          <th>Class</th>
                          <th>Email</th>
                          <th>Exams Attempted</th>
                          <th>Total Exams</th>
                          <th>Overall Performance</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {reports.map((student, index) => (
                          <tr key={student._id}>
                            <td>{index + 1}</td>
                            <td>{student.name}</td>
                            <td>{student.classSemester}</td>
                            <td>{student.email}</td>
                            <td>{student.examsAttempted}</td>
                            <td>{student.totalExams}</td>
                            <td>{student.performance}%</td>

                            <td>
                              <span
                                className={
                                  student.status === "Good"
                                    ? "status-pill active"
                                    : student.status === "Average"
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
                )}
              </section>

              <section id="audit" className="modern-panel">
                <div className="panel-header">
                  <h2>Audit Logs</h2>

                  <button type="button" onClick={fetchAuditLogs}>
                    Refresh Logs
                  </button>
                </div>

                {auditLoading ? (
                  <div className="modern-loader">Loading audit logs...</div>
                ) : auditLogs.length === 0 ? (
                  <p className="empty-text">No audit logs found.</p>
                ) : (
                  <div className="modern-table-wrap">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>SL</th>
                          <th>User</th>
                          <th>Role</th>
                          <th>Action</th>
                          <th>Details</th>
                          <th>IP Address</th>
                          <th>Time</th>
                        </tr>
                      </thead>

                      <tbody>
                        {auditLogs.map((log, index) => (
                          <tr key={log._id}>
                            <td>{index + 1}</td>
                            <td>{log.user?.name || "Unknown"}</td>
                            <td>{log.user?.role || "N/A"}</td>
                            <td>{log.action}</td>
                            <td>{log.details}</td>
                            <td>{log.ipAddress || "N/A"}</td>
                            <td>
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;