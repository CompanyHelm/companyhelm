import React from "react";

/**
 * Mirrors the loaded transcript layout so chat transitions avoid collapsing to
 * a spinner while the selected conversation payload is still resolving.
 */
export function ChatTranscriptLoadingSkeleton() {
  return (
    <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-2 py-5 md:px-6">
      <div className="flex justify-end">
        <div className="grid w-full max-w-[72%] gap-2 rounded-2xl bg-muted/40 p-4">
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted-foreground/15" />
          <div className="h-3 w-11/12 animate-pulse rounded-full bg-muted-foreground/15" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted-foreground/15" />
        </div>
      </div>

      <div className="grid w-full max-w-[78%] gap-3 rounded-2xl border border-border/50 bg-background/60 p-4 shadow-sm">
        <div className="h-3 w-32 animate-pulse rounded-full bg-muted-foreground/15" />
        <div className="h-3 w-full animate-pulse rounded-full bg-muted-foreground/15" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-muted-foreground/15" />
        <div className="h-20 w-full animate-pulse rounded-xl bg-muted/50" />
      </div>

      <div className="grid w-full max-w-[64%] gap-2 rounded-2xl border border-border/50 bg-background/60 p-4 shadow-sm">
        <div className="h-3 w-24 animate-pulse rounded-full bg-muted-foreground/15" />
        <div className="h-3 w-full animate-pulse rounded-full bg-muted-foreground/15" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted-foreground/15" />
      </div>
    </div>
  );
}
