import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app";
import { CompanyHelmAuthProvider } from "./components/auth/auth_provider";
import { AppRelayEnvironmentProvider } from "./components/relay_environment_provider";
import { RuntimeConfigurationError } from "./components/runtime_configuration_error";
import { config } from "./config";
import { AmplitudeAnalytics } from "./lib/amplitude_analytics";
import { GoogleAdsAnalytics } from "./lib/google_ads_analytics";
import { applicationRouter } from "./routes";
import "./index.css";

const rootElement = document.getElementById("app");

if (!rootElement) {
  throw new Error("Missing #app element.");
}

AmplitudeAnalytics.initialize(applicationRouter, config.analytics.amplitude);
GoogleAdsAnalytics.initialize(config.analytics.googleAds);

createRoot(rootElement).render(
  <StrictMode>
    {(config.authProvider === "clerk" && config.clerkPublishableKey.length === 0) ? (
      <RuntimeConfigurationError />
    ) : (
      <CompanyHelmAuthProvider>
        <AppRelayEnvironmentProvider>
          <App />
        </AppRelayEnvironmentProvider>
      </CompanyHelmAuthProvider>
    )}
  </StrictMode>,
);
