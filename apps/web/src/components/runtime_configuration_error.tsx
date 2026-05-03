import { ErrorState } from "@/components/error_state";

/**
 * Explains missing local runtime configuration so development failures stay actionable instead of
 * collapsing into an empty shell.
 */
export function RuntimeConfigurationError() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-10">
      <ErrorState
        className="w-full max-w-xl rounded-2xl border border-border/70 bg-card/90 px-6 py-6 shadow-sm"
        message="The web app is missing required runtime configuration."
        title="Missing runtime configuration"
      />
    </main>
  );
}
