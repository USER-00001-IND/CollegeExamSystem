import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.log("UI Crash:", error);
    console.log(errorInfo);
  }

  reloadPage = () => {
    window.location.reload();
  };

  goHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#eef5ff",
            padding: "20px",
            fontFamily: "Arial",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "420px",
              textAlign: "center",
              boxShadow:
                "0 8px 22px rgba(0,0,0,0.08)",
            }}
          >
            <h2
              style={{
                color: "#003f8f",
                marginBottom: "12px",
              }}
            >
              Something went wrong
            </h2>

            <p
              style={{
                color: "#555",
                marginBottom: "22px",
              }}
            >
              The page crashed unexpectedly.
            </p>

            <button
              onClick={this.reloadPage}
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                borderRadius: "8px",
                background: "#003f8f",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
                marginBottom: "12px",
              }}
            >
              Reload Page
            </button>

            <button
              onClick={this.goHome}
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                borderRadius: "8px",
                background: "#16a34a",
                color: "white",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;