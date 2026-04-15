import { ClerkProvider } from "@clerk/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { AppRelayEnvironmentProvider } from "./components/relay_environment_provider";
import { RuntimeConfigurationError } from "./components/runtime_configuration_error";
import { config } from "./config";
import { AmplitudeAnalytics } from "./lib/amplitude_analytics";
import { applicationRouter } from "./routes";
import "./index.css";

const rootElement = document.getElementById("app");
const clerkAppearance = {
  options: {
    privacyPageUrl: config.privacyPolicyUrl || undefined,
    termsPageUrl: config.termsOfServiceUrl || undefined,
  },
} as const;

if (!rootElement) {
  throw new Error("Missing #app element.");
}

AmplitudeAnalytics.initialize(applicationRouter, config.analytics.amplitude);

createRoot(rootElement).render(
  <StrictMode>
    {config.clerkPublishableKey.length === 0 ? (
      <RuntimeConfigurationError />
    ) : (
      <ClerkProvider appearance={clerkAppearance} publishableKey={config.clerkPublishableKey}>
        <AppRelayEnvironmentProvider>
          <App />
        </AppRelayEnvironmentProvider>
      </ClerkProvider>
    )}
  </StrictMode>,
);
