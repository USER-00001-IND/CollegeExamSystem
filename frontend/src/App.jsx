import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";

import StudentDashboard from "./pages/StudentDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import CreateTest from "./pages/CreateTest";
import AdminDashboard from "./pages/AdminDashboard";

import ProtectedRoute from "./components/ProtectedRoute";

import ExamPage from "./pages/ExamPage";
import Results from "./pages/Results";
import StudentResults from "./pages/StudentResults";
import ProctorLogs from "./pages/ProctorLogs";
import ManageExams from "./pages/ManageExams";
import LiveExam from "./pages/LiveExam";
import QuestionBank from "./pages/QuestionBank";
import StudentHistory from "./pages/StudentHistory";
import AdminExams from "./pages/AdminExams";
import CreateAdminExam from "./pages/CreateAdminExam";
import ServerOffline from "./pages/ServerOffline";

import AssignedPapers from "./pages/AssignedPapers";
import EvaluatePaper from "./pages/EvaluatePaper";

import AcademicsManagement from "./pages/AcademicsManagement";
import SelectSubjects from "./pages/SelectSubjects";

import AdminResultWorkflow from "./pages/AdminResultWorkflow";
import AdminProctorView from "./pages/AdminProctorView";

import "./styles/auth.css";

function Home() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">C</div>

        <h1>College Exam System</h1>

        <p className="subtitle">
          Secure online examination platform
        </p>

        <div className="divider">
          <span>Secure Platform</span>
        </div>

        <Link to="/login">
          <button>Login</button>
        </Link>

        <Link to="/register">
          <button type="button">
            Create Account
          </button>
        </Link>
      </div>

      <div className="footer-text">
        Secure Exam Platform
      </div>
    </div>
  );
}

function StudentSubjectRoute({ children }) {
  const user = JSON.parse(
    localStorage.getItem("user")
  );

  if (
    user?.role === "student" &&
    !user?.subjectSelectionCompleted
  ) {
    return <SelectSubjects />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentSubjectRoute>
                <StudentDashboard />
              </StudentSubjectRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/exam"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentSubjectRoute>
                <ExamPage />
              </StudentSubjectRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student-results"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentSubjectRoute>
                <StudentResults />
              </StudentSubjectRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/student-history"
          element={
            <ProtectedRoute allowedRole="student">
              <StudentSubjectRoute>
                <StudentHistory />
              </StudentSubjectRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/select-subjects"
          element={
            <ProtectedRoute allowedRole="student">
              <SelectSubjects />
            </ProtectedRoute>
          }
        />

        <Route
          path="/faculty-dashboard"
          element={
            <ProtectedRoute allowedRole="faculty">
              <FacultyDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-test"
          element={
            <ProtectedRoute allowedRole="faculty">
              <CreateTest />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manage-exams"
          element={
            <ProtectedRoute allowedRole="faculty">
              <ManageExams />
            </ProtectedRoute>
          }
        />

        <Route
          path="/results"
          element={
            <ProtectedRoute allowedRole="faculty">
              <Results />
            </ProtectedRoute>
          }
        />

        <Route
          path="/question-bank"
          element={
            <ProtectedRoute allowedRole="faculty">
              <QuestionBank />
            </ProtectedRoute>
          }
        />

        <Route
          path="/proctor-logs"
          element={
            <ProtectedRoute allowedRole="faculty">
              <ProctorLogs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assigned-papers"
          element={
            <ProtectedRoute allowedRole="faculty">
              <AssignedPapers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/evaluate-paper/:id"
          element={
            <ProtectedRoute allowedRole="faculty">
              <EvaluatePaper />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/live-exams"
          element={
            <ProtectedRoute allowedRole="admin">
              <LiveExam />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin-exams"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminExams />
            </ProtectedRoute>
          }
        />

        <Route
          path="/create-admin-exam"
          element={
            <ProtectedRoute allowedRole="admin">
              <CreateAdminExam />
            </ProtectedRoute>
          }
        />

        <Route
          path="/academics-management"
          element={
            <ProtectedRoute allowedRole="admin">
              <AcademicsManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/server-offline"
          element={<ServerOffline />}
        />
        <Route
          path="/admin-result-workflow"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminResultWorkflow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-proctor-view"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminProctorView />
            </ProtectedRoute>
          } />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={2500}
      />
    </BrowserRouter>
  );
}

export default App;