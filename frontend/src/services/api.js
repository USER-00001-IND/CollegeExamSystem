import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,

  (error) => {
    const currentPath = window.location.pathname;

    const publicPaths = [
      "/",
      "/login",
      "/register",
      "/forgot-password",
      "/server-offline",
    ];

    if (!error.response) {
      if (!publicPaths.includes(currentPath)) {
        window.location.href = "/server-offline";
      }

      return Promise.reject(error);
    }

    const status = error.response?.status;
    const message = error.response?.data?.message;
    const code = error.response?.data?.code;

    const authError =
      status === 401 &&
      (
        message === "Invalid token" ||
        message === "No token provided" ||
        message === "User not found" ||
        code === "SESSION_EXPIRED" ||
        code === "TOKEN_EXPIRED"
      );

    if (authError && !publicPaths.includes(currentPath)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("profileImage");

      const sessionMessage =
        code === "SESSION_EXPIRED"
          ? "Logged out because your account was used on another device."
          : code === "TOKEN_EXPIRED"
          ? "Session expired. Please login again."
          : "Authentication expired.";

      alert(sessionMessage);

      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default API;