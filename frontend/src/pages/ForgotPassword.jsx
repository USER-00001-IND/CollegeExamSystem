import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/auth.css";

function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const sendOtp = async (e) => {
    e.preventDefault();

    if (!form.email) {
      toast.error("Email is required");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/forgot-password", {
        email: form.email,
      });

      toast.success(res.data.message);
      setStep("reset");
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast.error(error.response?.data?.message || "Failed to send OTP");
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();

    if (!form.otp || !form.newPassword || !form.confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!passwordRegex.test(form.newPassword)) {
      toast.error(
        "Password must be at least 8 characters with uppercase, lowercase, and number"
      );
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/auth/reset-password", {
        email: form.email,
        otp: form.otp,
        newPassword: form.newPassword,
      });

      toast.success(res.data.message);

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      setLoading(false);
      toast.error(error.response?.data?.message || "Password reset failed");
    }
  };

  return (
    <div className="auth-page">
      <div className="top-bar"></div>

      <div className="auth-card">
        <div className="auth-icon">C</div>

        <h1>Forgot Password</h1>

        <p className="subtitle">
          Reset your password using email OTP
        </p>

        <div className="divider">
          <span>Password Recovery</span>
        </div>

        {step === "email" ? (
          <form onSubmit={sendOtp}>
            <label>Email</label>

            <input
              name="email"
              type="email"
              placeholder="Enter your Gmail address"
              value={form.email}
              onChange={handleChange}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <label>Email</label>

            <input
              name="email"
              type="email"
              value={form.email}
              readOnly
            />

            <label>OTP</label>

            <input
              name="otp"
              type="text"
              placeholder="Enter 6 digit OTP"
              value={form.otp}
              maxLength={6}
              onChange={handleChange}
              required
            />

            <label>New Password</label>

            <input
              name="newPassword"
              type="password"
              placeholder="Enter new password"
              value={form.newPassword}
              onChange={handleChange}
              required
            />

            <label>Confirm Password</label>

            <input
              name="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => setStep("email")}
            >
              Change Email
            </button>
          </form>
        )}

        <p className="register-text">
          Remember password? <Link to="/login">Login Here</Link>
        </p>
      </div>

      <div className="footer-text">
        Secure Exam Platform
      </div>
    </div>
  );
}

export default ForgotPassword;