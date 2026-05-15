import React from "react";

/**
 * Reserves the composer footprint during loading so the transcript skeleton and
 * input area keep the same vertical rhythm as the hydrated chat view.
 */
export function ChatComposerLoadingSkeleton() {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/85 p-3 shadow-sm" data-testid="chats-loading-composer">
      <div className="h-20 w-full animate-pulse rounded-xl bg-muted/45" />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted/60" />
          <div className="h-8 w-32 animate-pulse rounded-full bg-muted/60" />
        </div>
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted/60" />
      </div>
    </div>
  );
}
