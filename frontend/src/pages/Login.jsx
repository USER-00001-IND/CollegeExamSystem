import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import API from "../services/api";

import "../styles/auth.css";

function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password) {
      toast.error("Email and password are required");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post(
        "/auth/login",
        form
      );

      localStorage.setItem(
        "token",
        res.data.token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(res.data.user)
      );

      toast.success("Login successful");

      setTimeout(() => {
        if (
          res.data.user.role ===
          "student"
        ) {
          if (
            !res.data.user
              .subjectSelectionCompleted
          ) {
            window.location.replace(
              "/select-subjects"
            );
          } else {
            window.location.replace(
              "/student-dashboard"
            );
          }
        } else if (
          res.data.user.role ===
          "faculty"
        ) {
          window.location.replace(
            "/faculty-dashboard"
          );
        } else if (
          res.data.user.role ===
          "admin"
        ) {
          window.location.replace(
            "/admin-dashboard"
          );
        }
      }, 600);
    } catch (error) {
      setLoading(false);

      if (
        error.response?.data
          ?.message ===
        "Please verify your email first"
      ) {
        toast.error(
          "Verify your email before login"
        );

        return;
      }

      toast.error(
        error.response?.data
          ?.message || "Login failed"
      );
    }
  };

  return (
    <div className="auth-page">
      <div className="top-bar"></div>

      <div className="auth-card">
        <div className="auth-icon">
          C
        </div>

        <h1>
          Welcome to Exam Portal
        </h1>

        <p className="subtitle">
          Please login to continue
          to your exam
        </p>

        <div className="divider">
          <span>
            Secure Login
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Username / Email
          </label>

          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label>Password</label>

          <input
            name="password"
            type="password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <Link
            to="/forgot-password"
            className="forgot"
          >
            Forgot Password?
          </Link>

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <div className="or">
          OR
        </div>

        <p className="register-text">
          New to Exam Portal?{" "}
          <Link to="/register">
            Register Here
          </Link>
        </p>
      </div>

      <div className="footer-text">
        Secure Exam Platform
      </div>
    </div>
  );
}

export default Login;