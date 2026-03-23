import { ClerkProvider } from "@clerk/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { AppRelayEnvironmentProvider } from "./components/relay_environment_provider";
import { config } from "./config";
import "./index.css";

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Missing #app element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ClerkProvider publishableKey={config.clerkPublishableKey}>
      <AppRelayEnvironmentProvider>
        <App />
      </AppRelayEnvironmentProvider>
    </ClerkProvider>
  </StrictMode>,
);
