import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/dashboard.css";

function AcademicsManagement() {
  const [departments, setDepartments] = useState([]);
  const [streams, setStreams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    code: "",
  });

  const [streamForm, setStreamForm] = useState({
    name: "",
  });

  const [classForm, setClassForm] = useState({
    stream: "",
    name: "",
  });

  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    stream: "",
    classSemester: "",
    courseCategory: "common",
    departmentMode: "none",
    allowedDepartments: [],
  });

  const fetchAcademics = async () => {
    try {
      const [deptRes, streamRes, classRes, subjectRes] = await Promise.all([
        API.get("/academics/departments"),
        API.get("/academics/streams"),
        API.get("/academics/classes"),
        API.get("/academics/subjects"),
      ]);

      setDepartments(deptRes.data);
      setStreams(streamRes.data);
      setClasses(classRes.data);
      setSubjects(subjectRes.data);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load academics data");
    }
  };

  useEffect(() => {
    fetchAcademics();
  }, []);

  const createDepartment = async (e) => {
    e.preventDefault();

    try {
      await API.post("/academics/departments", departmentForm);

      toast.success("Department created");

      setDepartmentForm({
        name: "",
        code: "",
      });

      fetchAcademics();
    } catch (error) {
      toast.error(error.response?.data?.message || "Department creation failed");
    }
  };

  const createStream = async (e) => {
    e.preventDefault();

    try {
      await API.post("/academics/streams", streamForm);

      toast.success("Stream created");

      setStreamForm({
        name: "",
      });

      fetchAcademics();
    } catch (error) {
      toast.error(error.response?.data?.message || "Stream creation failed");
    }
  };

  const createClass = async (e) => {
    e.preventDefault();

    try {
      await API.post("/academics/classes", classForm);

      toast.success("Class created");

      setClassForm({
        stream: "",
        name: "",
      });

      fetchAcademics();
    } catch (error) {
      toast.error(error.response?.data?.message || "Class creation failed");
    }
  };

  const createSubject = async (e) => {
    e.preventDefault();

    try {
      await API.post("/academics/subjects", subjectForm);

      toast.success("Subject created");

      setSubjectForm({
        name: "",
        code: "",
        stream: "",
        classSemester: "",
        courseCategory: "common",
        departmentMode: "none",
        allowedDepartments: [],
      });

      fetchAcademics();
    } catch (error) {
      toast.error(error.response?.data?.message || "Subject creation failed");
    }
  };

  const filteredClassesForSubject = subjectForm.stream
    ? classes.filter((item) => item.stream?._id === subjectForm.stream)
    : classes;

  const toggleAllowedDepartment = (departmentId) => {
    const exists = subjectForm.allowedDepartments.includes(departmentId);

    setSubjectForm({
      ...subjectForm,
      allowedDepartments: exists
        ? subjectForm.allowedDepartments.filter((id) => id !== departmentId)
        : [...subjectForm.allowedDepartments, departmentId],
    });
  };

  return (
    <div className="modern-dashboard">
      <aside className="modern-sidebar">
        <div className="brand-box">
          <div className="brand-icon">A</div>

          <div>
            <h2>Exam System</h2>
            <p>Academics</p>
          </div>
        </div>

        <nav className="modern-nav">
          <a href="/admin-dashboard">Dashboard</a>

          <a className="active" href="/academics-management">
            Academics Management
          </a>

          <a href="/admin-exams">Admin Exams</a>

          <a href="/create-admin-exam">Create Admin Exam</a>

          <a href="/live-exams">Live Exam</a>
        </nav>
      </aside>

      <main className="modern-main">
        <header className="modern-topbar">
          <div className="topbar-left">
            <h1>Academics Management</h1>
            <p>Register streams, classes, departments and university subjects.</p>
          </div>
        </header>

        <section className="modern-content">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue-soft">D</div>

              <div>
                <h3>Departments</h3>
                <h2>{departments.length}</h2>
                <p>Registered departments</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green-soft">S</div>

              <div>
                <h3>Streams</h3>
                <h2>{streams.length}</h2>
                <p>Registered streams</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange-soft">C</div>

              <div>
                <h3>Classes</h3>
                <h2>{classes.length}</h2>
                <p>Registered classes</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple-soft">B</div>

              <div>
                <h3>Subjects</h3>
                <h2>{subjects.length}</h2>
                <p>Registered subjects</p>
              </div>
            </div>
          </div>

          <div className="dashboard-two-col">
            <section className="modern-panel">
              <div className="panel-header">
                <h2>Register Department</h2>
              </div>

              <form className="create-test-form" onSubmit={createDepartment}>
                <input
                  type="text"
                  placeholder="Department Name"
                  required
                  value={departmentForm.name}
                  onChange={(e) =>
                    setDepartmentForm({
                      ...departmentForm,
                      name: e.target.value,
                    })
                  }
                />

                <input
                  type="text"
                  placeholder="Department Code"
                  required
                  value={departmentForm.code}
                  onChange={(e) =>
                    setDepartmentForm({
                      ...departmentForm,
                      code: e.target.value,
                    })
                  }
                />

                <button type="submit">Save Department</button>
              </form>
            </section>

            <section className="modern-panel">
              <div className="panel-header">
                <h2>Register Stream</h2>
              </div>

              <form className="create-test-form" onSubmit={createStream}>
                <input
                  type="text"
                  placeholder="Stream Name"
                  required
                  value={streamForm.name}
                  onChange={(e) =>
                    setStreamForm({
                      name: e.target.value,
                    })
                  }
                />

                <button type="submit">Save Stream</button>
              </form>
            </section>
          </div>

          <div className="dashboard-two-col">
            <section className="modern-panel">
              <div className="panel-header">
                <h2>Register Class</h2>
              </div>

              <form className="create-test-form" onSubmit={createClass}>
                <select
                  required
                  value={classForm.stream}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      stream: e.target.value,
                    })
                  }
                >
                  <option value="">Select Stream</option>

                  {streams.map((stream) => (
                    <option key={stream._id} value={stream._id}>
                      {stream.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Class / Semester Name"
                  required
                  value={classForm.name}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      name: e.target.value,
                    })
                  }
                />

                <button type="submit">Save Class</button>
              </form>
            </section>

            <section className="modern-panel">
              <div className="panel-header">
                <h2>Register Subject</h2>
              </div>

              <form className="create-test-form" onSubmit={createSubject}>
                <input
                  type="text"
                  placeholder="Subject Name"
                  required
                  value={subjectForm.name}
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                      name: e.target.value,
                    })
                  }
                />

                <input
                  type="text"
                  placeholder="Subject Code"
                  required
                  value={subjectForm.code}
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                      code: e.target.value,
                    })
                  }
                />

                <select
                  required
                  value={subjectForm.courseCategory}
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                      courseCategory: e.target.value,
                    })
                  }
                >
                  <option value="major">Major</option>
                  <option value="minor">Minor</option>
                  <option value="common">Common</option>
                  <option value="aec">AEC</option>
                  <option value="sec">SEC</option>
                  <option value="vac">VAC</option>
                  <option value="mdc">MDC</option>
                  <option value="elective">Elective</option>
                </select>

                <select
                  required
                  value={subjectForm.departmentMode}
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                      departmentMode: e.target.value,
                      allowedDepartments: [],
                    })
                  }
                >
                  <option value="none">No Department</option>
                  <option value="single">Single Department</option>
                  <option value="multiple">Multiple Departments</option>
                  <option value="all">All Departments</option>
                </select>

                <select
                  required
                  value={subjectForm.stream}
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                      stream: e.target.value,
                      classSemester: "",
                    })
                  }
                >
                  <option value="">Select Stream</option>

                  {streams.map((stream) => (
                    <option key={stream._id} value={stream._id}>
                      {stream.name}
                    </option>
                  ))}
                </select>

                <select
                  required
                  value={subjectForm.classSemester}
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                      classSemester: e.target.value,
                    })
                  }
                >
                  <option value="">Select Class</option>

                  {filteredClassesForSubject.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
                </select>

                {subjectForm.departmentMode ===
                "single" && (
                <select
                  required
                  value={
                    subjectForm
                      .allowedDepartments[0] || ""
                  }
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                    
                      allowedDepartments:
                        e.target.value
                          ? [e.target.value]
                          : [],
                    })
                  }
                  
                >
                  <option value="">
                    Select Department
                  </option>
                
                  {departments.map(
                    (department) => (
                      <option
                        key={department._id}
                        value={
                          department._id
                        }
                      >
                        {department.name}
                      </option>
                    )
                  )}
                </select>
              )}

              {subjectForm.departmentMode ===
                "multiple" && (
                <div>
                  <label>
                    Allowed Departments
                  </label>
                
                  {departments.map(
                    (department) => (
                      <label
                        key={department._id}
                        style={{
                          display: "block",
                          marginBottom: "6px",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={subjectForm.allowedDepartments.includes(
                            department._id
                          )}
                          onChange={() =>
                            toggleAllowedDepartment(
                              department._id
                            )
                          }
                        />

                        {department.name}
                      </label>
                    )
                  )}
                </div>
              )}
                

                <button type="submit">Save Subject</button>
              </form>
            </section>
          </div>

          <section className="modern-panel">
            <div className="panel-header">
              <h2>Registered Subjects</h2>

              <button type="button" onClick={fetchAcademics}>
                Refresh
              </button>
            </div>

            {subjects.length === 0 ? (
              <p className="empty-text">No subjects registered.</p>
            ) : (
              <div className="modern-table-wrap">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>SL</th>
                      <th>Subject</th>
                      <th>Code</th>
                      <th>Category</th>
                      <th>Department Mode</th>
                      <th>Departments</th>
                      <th>Stream</th>
                      <th>Class</th>
                    </tr>
                  </thead>

                  <tbody>
                    {subjects.map((subject, index) => (
                      <tr key={subject._id}>
                        <td>{index + 1}</td>
                        <td>{subject.name}</td>
                        <td>{subject.code}</td>
                        <td>{subject.courseCategory || "N/A"}</td>
                        <td>{subject.departmentMode || "N/A"}</td>
                        <td>
                          {subject.allowedDepartments?.length
                            ? subject.allowedDepartments
                                .map((department) => department.name)
                                .join(", ")
                            : "N/A"}
                        </td>
                        <td>{subject.stream?.name || "N/A"}</td>
                        <td>{subject.classSemester?.name || "N/A"}</td>
                      </tr>
                    ))}
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

export default AcademicsManagement;