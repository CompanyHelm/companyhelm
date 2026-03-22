import { ClerkProvider } from "@clerk/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { config } from "./config";
import "./index.css";

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Missing #app element.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ClerkProvider publishableKey={config.clerkPublishableKey}>
      <App />
    </ClerkProvider>
  </StrictMode>,
);
