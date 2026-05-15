import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

import { MathJaxContext } from "better-react-mathjax";

const config = {
  loader: {
    load: ["input/tex", "output/chtml"],
  },
};

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MathJaxContext config={config}>
        <App />
      </MathJaxContext>
    </ErrorBoundary>
  </React.StrictMode>
);