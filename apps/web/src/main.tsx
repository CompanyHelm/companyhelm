import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./index.css";

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Missing #app element.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
