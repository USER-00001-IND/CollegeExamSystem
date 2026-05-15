import "../styles/auth.css";

function ServerOffline() {
  const retryConnection = () => {
    window.location.href = "/login";
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-icon">!</div>

        <h1>Server Offline</h1>

        <p className="subtitle">
          Exam server is currently offline or under maintenance.
        </p>

        <div className="divider">
          <span>Please try again later</span>
        </div>

        <button type="button" onClick={retryConnection}>
          Retry
        </button>

        <p className="subtitle">
          If an exam is scheduled, contact the administrator.
        </p>
      </div>

      <div className="footer-text">
        Secure Exam Platform
      </div>
    </div>
  );
}

export default ServerOffline;