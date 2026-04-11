import { config } from "@/config";
import { ErrorState } from "@/components/error_state";

/**
 * Explains missing local runtime configuration before the app mounts Clerk so development
 * failures stay actionable instead of collapsing into an empty shell.
 */
export function RuntimeConfigurationError() {
  const missingClerkPublishableKey = config.clerkPublishableKey.length === 0;
  const message = missingClerkPublishableKey
    ? "Set VITE_CLERK_PUBLISHABLE_KEY for local Vite development or inject clerkPublishableKey into /runtime-config.js before loading the web app."
    : "The web app is missing required runtime configuration.";

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-10">
      <ErrorState
        className="w-full max-w-xl rounded-2xl border border-border/70 bg-card/90 px-6 py-6 shadow-sm"
        message={message}
        title="Missing runtime configuration"
      />
    </main>
  );
}
