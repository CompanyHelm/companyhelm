import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { CompanyHelmAuthProvider } from "./components/auth/auth_provider";
import { AppRelayEnvironmentProvider } from "./components/relay_environment_provider";
import "./index.css";

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Missing #app element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <CompanyHelmAuthProvider>
      <AppRelayEnvironmentProvider>
        <App />
      </AppRelayEnvironmentProvider>
    </CompanyHelmAuthProvider>
  </StrictMode>,
);
