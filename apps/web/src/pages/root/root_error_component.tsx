import type { ErrorComponentProps } from "@tanstack/react-router";
import { ErrorState } from "@/components/error_state";

/**
 * Handles any uncaught route render failure so the app shows a recoverable screen instead of the
 * router's default console-heavy warning path.
 */
export function RootErrorComponent(props: ErrorComponentProps) {
  const message = props.error instanceof Error
    ? props.error.message
    : "An unexpected error interrupted the page render.";

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-10">
      <ErrorState
        actionLabel="Try again"
        className="w-full max-w-xl rounded-2xl border border-border/70 bg-card/90 px-6 py-6 shadow-sm"
        message={message}
        onAction={props.reset}
        title="Unable to load this page"
      />
    </main>
  );
}
