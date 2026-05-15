import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../services/api";
import "../styles/auth.css";

function Register() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [departments, setDepartments] = useState([]);
  const [streams, setStreams] = useState([]);
  const [classes, setClasses] = useState([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "student",
    department: "",
    stream: "",
    classSemester: "",
  });

  useEffect(() => {
    fetchAcademicData();
  }, []);

  const fetchAcademicData = async () => {
    try {
      const [deptRes, streamRes] = await Promise.all([
        API.get("/academics/departments"),
        API.get("/academics/streams"),
      ]);

      setDepartments(deptRes.data);
      setStreams(streamRes.data);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load academic options");
    }
  };

  const fetchClasses = async (streamId) => {
    if (!streamId) {
      setClasses([]);
      return;
    }

    try {
      const res = await API.get(`/academics/classes?stream=${streamId}`);
      setClasses(res.data);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load classes");
    }
  };

  const isHSClass = (className) => {
    return className?.startsWith("HS");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: value,
      };

      if (name === "role") {
        updated.department = "";
        updated.stream = "";
        updated.classSemester = "";
        setClasses([]);
      }

      if (name === "stream") {
        updated.department = "";
        updated.classSemester = "";
        setClasses([]);
        fetchClasses(value);
      }

      if (name === "classSemester") {
        updated.department = "";
      }

      return updated;
    });
  };

  const validateForm = () => {
    if (
      !form.name ||
      !form.email ||
      !form.phone ||
      !form.password ||
      !form.role
    ) {
      toast.error("All fields are required");
      return false;
    }

    const nameRegex = /^[A-Za-z\s]+$/;
    const emailRegex = /^[^\s@]+@gmail\.com$/i;
    const phoneRegex = /^[6-9]\d{9}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!nameRegex.test(form.name.trim())) {
      toast.error("Name must contain only letters and spaces");
      return false;
    }

    if (!emailRegex.test(form.email.trim())) {
      toast.error("Enter a valid Gmail address");
      return false;
    }

    if (!phoneRegex.test(form.phone.trim())) {
      toast.error("Phone number must be a valid 10 digit Indian number");
      return false;
    }

    if (!passwordRegex.test(form.password.trim())) {
      toast.error(
        "Password must be at least 8 characters with uppercase, lowercase, and number"
      );
      return false;
    }

    if (form.role === "student" && (!form.stream || !form.classSemester)) {
      toast.error("Stream and class required");
      return false;
    }

    if (
      form.role === "student" &&
      form.classSemester &&
      !isHSClass(form.classSemester) &&
      !form.department
    ) {
      toast.error("Department required for graduation students");
      return false;
    }

    if (form.role === "faculty" && !form.department) {
      toast.error("Department required for faculty");
      return false;
    }

    return true;
  };

  const getStreamName = (streamId) => {
    return streams.find((item) => item._id === streamId)?.name || "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const payload =
        form.role === "faculty"
          ? {
              name: form.name,
              email: form.email,
              phone: form.phone,
              password: form.password,
              role: form.role,
              department: form.department,
            }
          : {
              name: form.name,
              email: form.email,
              phone: form.phone,
              password: form.password,
              role: form.role,
              department: isHSClass(form.classSemester) ? "" : form.department,
              stream: getStreamName(form.stream),
              classSemester: form.classSemester,
            };

      const res = await API.post("/auth/register", payload);

      toast.success(res.data.message);

      setRegisteredEmail(form.email);
      setOtpStep(true);
      setLoading(false);
    } catch (error) {
      setLoading(false);

      toast.error(error.response?.data?.message || "Registration failed");
    }
  };

  const verifyOtp = async () => {
    if (!otp.trim()) {
      toast.error("Enter OTP");
      return;
    }

    try {
      setOtpLoading(true);

      const res = await API.post("/auth/verify-email", {
        email: registeredEmail,
        otp,
      });

      toast.success(res.data.message);
      setOtpLoading(false);

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      setOtpLoading(false);

      toast.error(error.response?.data?.message || "OTP verification failed");
    }
  };

  const resendOtp = async () => {
    try {
      await API.post("/auth/resend-otp", {
        email: registeredEmail,
      });

      toast.success("OTP resent successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend OTP");
    }
  };

  return (
    <div className="auth-page">
      <div className="top-bar"></div>

      <div className="auth-card register-card">
        <div className="auth-icon">C</div>

        {!otpStep ? (
          <>
            <h1>Create Account</h1>

            <p className="subtitle">Register to access the exam portal</p>

            <div className="divider">
              <span>Secure Register</span>
            </div>

            <form onSubmit={handleSubmit}>
              <label>Full Name</label>

              <input
                name="name"
                value={form.name}
                placeholder="Enter your full name"
                required
                onChange={handleChange}
              />

              <label>Email</label>

              <input
                name="email"
                value={form.email}
                type="email"
                placeholder="Enter your email"
                required
                onChange={handleChange}
              />

              <label>Phone Number</label>

              <input
                name="phone"
                value={form.phone}
                type="tel"
                placeholder="Enter phone number"
                required
                onChange={handleChange}
              />

              <label>Password</label>

              <input
                name="password"
                value={form.password}
                type="password"
                placeholder="Enter your password"
                required
                onChange={handleChange}
              />

              <label>Role</label>

              <select
                name="role"
                required
                value={form.role}
                onChange={handleChange}
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </select>

              {form.role === "faculty" && (
                <>
                  <label>Department</label>

                  <select
                    name="department"
                    required
                    value={form.department}
                    onChange={handleChange}
                  >
                    <option value="">Select Department</option>

                    {departments.map((item) => (
                      <option key={item._id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {form.role === "student" && (
                <>
                  <label>Stream</label>

                  <select
                    name="stream"
                    required
                    value={form.stream}
                    onChange={handleChange}
                  >
                    <option value="">Select Stream</option>

                    {streams.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <label>Class / Semester</label>

                  <select
                    name="classSemester"
                    required
                    value={form.classSemester}
                    onChange={handleChange}
                    disabled={!form.stream}
                  >
                    <option value="">
                      {form.stream ? "Select Class" : "Select stream first"}
                    </option>

                    {classes.map((item) => (
                      <option key={item._id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  {!isHSClass(form.classSemester) && form.classSemester && (
                    <>
                      <label>Department</label>

                      <select
                        name="department"
                        required
                        value={form.department}
                        onChange={handleChange}
                      >
                        <option value="">Select Department</option>

                        {departments.map((item) => (
                          <option key={item._id} value={item.name}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </>
              )}

              <button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Register"}
              </button>
            </form>

            <p className="register-text">
              Already have an account? <Link to="/login">Login Here</Link>
            </p>
          </>
        ) : (
          <>
            <h1>Verify Email</h1>

            <p className="subtitle">Enter the OTP sent to your Gmail</p>

            <div className="divider">
              <span>Email Verification</span>
            </div>

            <div className="otp-box">
              <p>OTP sent to:</p>

              <strong>{registeredEmail}</strong>

              <input
                type="text"
                placeholder="Enter 6 digit OTP"
                value={otp}
                maxLength={6}
                onChange={(e) => setOtp(e.target.value)}
              />

              <button onClick={verifyOtp} disabled={otpLoading}>
                {otpLoading ? "Verifying..." : "Verify OTP"}
              </button>

              <button type="button" className="secondary-btn" onClick={resendOtp}>
                Resend OTP
              </button>
            </div>
          </>
        )}
      </div>

      <div className="footer-text">Secure Exam Platform</div>
    </div>
  );
}

export default Register;