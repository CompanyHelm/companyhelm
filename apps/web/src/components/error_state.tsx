import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  actionLabel?: string;
  className?: string;
  message: string;
  onAction?: (() => void) | undefined;
  title: string;
}

/**
 * Renders a consistent recovery card for page-level failures so data fetch issues look deliberate
 * across the web UI instead of falling back to router debug output.
 */
export function ErrorState(props: ErrorStateProps) {
  return (
    <div className={props.className ?? "rounded-xl border border-border/70 bg-card/80 px-5 py-6 shadow-sm"}>
      <div className="space-y-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {props.title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {props.message}
        </p>
      </div>
      {props.onAction ? (
        <div className="mt-4">
          <Button onClick={props.onAction} size="sm" variant="outline">
            {props.actionLabel ?? "Try again"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
