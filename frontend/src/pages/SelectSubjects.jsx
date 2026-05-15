import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";

function SelectSubjects() {
  const [loading, setLoading] = useState(false);

  const [majorSubjects, setMajorSubjects] = useState([]);
  const [minorSubjects, setMinorSubjects] = useState([]);
  const [commonSubjects, setCommonSubjects] = useState([]);
  const [electiveSubjects, setElectiveSubjects] = useState([]);

  const [selectedMajorSubjects, setSelectedMajorSubjects] = useState([]);
  const [selectedMinorSubjects, setSelectedMinorSubjects] = useState([]);
  const [selectedCommonSubjects, setSelectedCommonSubjects] = useState([]);
  const [selectedElectiveSubjects, setSelectedElectiveSubjects] = useState([]);

  const user = JSON.parse(localStorage.getItem("user"));

  const isHS = user?.classSemester?.toLowerCase().startsWith("hs");

  useEffect(() => {
    let ignore = false;

    const fetchSubjects = async () => {
      try {
        const res = await API.get("/academics/subjects");

        if (ignore) return;

        const filtered = res.data.filter((item) => {
        const sameStream =
          String(item.stream?.name || "").trim().toLowerCase() ===
          String(user.stream || "").trim().toLowerCase();

        const sameClass =
          String(item.classSemester?.name || "").trim().toLowerCase() ===
          String(user.classSemester || "").trim().toLowerCase();

        if (!sameStream || !sameClass) return false;

        if (isHS) {
          return item.departmentMode === "none";
        }

        if (
          item.departmentMode === "none" ||
          item.departmentMode === "all"
        ) {
          return true;
        }

        return item.allowedDepartments?.some(
          (department) =>
            String(department.name || "").trim().toLowerCase() ===
            String(user.department || "").trim().toLowerCase()
        );
      });

        setMajorSubjects(
          filtered.filter((item) => item.courseCategory === "major")
        );

        setMinorSubjects(
          filtered.filter((item) => item.courseCategory === "minor")
        );

        setCommonSubjects(
          filtered.filter((item) =>
            ["common", "aec", "sec", "vac", "mdc"].includes(item.courseCategory)
          )
        );

        setElectiveSubjects(
          filtered.filter((item) => item.courseCategory === "elective")
        );
      } catch (error) {
        if (ignore) return;

        console.log(error);
        toast.error("Failed to load subjects");
      }
    };

    fetchSubjects();

    return () => {
      ignore = true;
    };
  }, [
    isHS,
    user.classSemester,
    user.department,
    user.stream,
  ]);

  const toggleSelection = (value, setSelected) => {
    setSelected((prev) =>
      prev.includes(value)
        ? prev.filter((item) => item !== value)
        : [...prev, value]
    );
  };

  const submitSubjects = async () => {
    if (!isHS && selectedMajorSubjects.length === 0) {
      toast.error("Select at least one major subject");
      return;
    }

    if (isHS && selectedCommonSubjects.length === 0) {
      toast.error("Select your HS subjects");
      return;
    }

    try {
      setLoading(true);

      const res = await API.put("/auth/select-subjects", {
        majorSubjects: isHS ? [] : selectedMajorSubjects,
        minorSubjects: isHS ? [] : selectedMinorSubjects,
        commonSubjects: selectedCommonSubjects,
        electiveSubjects: isHS ? [] : selectedElectiveSubjects,
      });

      const updatedUser = {
        ...user,
        majorSubjects: res.data.user.majorSubjects,
        minorSubjects: res.data.user.minorSubjects,
        commonSubjects: res.data.user.commonSubjects,
        electiveSubjects: res.data.user.electiveSubjects,
        selectedSubjects: res.data.user.selectedSubjects,
        subjectSelectionCompleted: true,
      };

      localStorage.setItem("user", JSON.stringify(updatedUser));

      toast.success("Subjects selected successfully");

      setTimeout(() => {
        window.location.replace("/student-dashboard");
      }, 800);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to save subjects"
      );
    } finally {
      setLoading(false);
    }
  };

  const renderSubjectGroup = (title, subjects, selected, setSelected) => {
    if (subjects.length === 0) return null;

    return (
      <>
        <label>{title}</label>

        <div className="subject-selection-box">
          {subjects.map((item) => (
            <label key={item._id} className="subject-checkbox">
              <input
                type="checkbox"
                checked={selected.includes(item.name)}
                onChange={() => toggleSelection(item.name, setSelected)}
              />

              {item.name} ({item.courseCategory})
            </label>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="auth-page">
      <div className="top-bar"></div>

      <div className="auth-card register-card">
        <h1>Select Subjects</h1>

        <p className="subtitle">
          {user?.stream} | {user?.classSemester}
          {user?.department ? ` | ${user.department}` : ""}
        </p>

        <div className="divider">
          <span>Subject Selection</span>
        </div>

        {!isHS &&
          renderSubjectGroup(
            "Major Subjects",
            majorSubjects,
            selectedMajorSubjects,
            setSelectedMajorSubjects
          )}

        {!isHS &&
          renderSubjectGroup(
            "Minor Subjects",
            minorSubjects,
            selectedMinorSubjects,
            setSelectedMinorSubjects
          )}

        {renderSubjectGroup(
          isHS ? "HS Subjects" : "Common / AEC / SEC / VAC / MDC Subjects",
          commonSubjects,
          selectedCommonSubjects,
          setSelectedCommonSubjects
        )}

        {!isHS &&
          renderSubjectGroup(
            "Elective Subjects",
            electiveSubjects,
            selectedElectiveSubjects,
            setSelectedElectiveSubjects
          )}

        <button onClick={submitSubjects} disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

export default SelectSubjects;
