import React from "react";

/**
 * Keeps the desktop agent/session rail visually stable while the chats landing
 * page performs its initial Relay fetch.
 */
export function ChatListLoadingSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col px-3 md:px-4" data-testid="chats-loading-list">
      <div className="mb-2 flex items-center justify-end pr-1">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-muted/50" />
      </div>

      <div className="mb-4 h-10 w-full animate-pulse rounded-lg bg-muted/55" />

      <div className="grid gap-4">
        {[0, 1, 2].map((agentIndex) => (
          <div className="grid gap-2" key={agentIndex}>
            <div className="flex items-center gap-2">
              <div className="h-8 w-6 animate-pulse rounded-md bg-muted/45" />
              <div className="h-4 flex-1 animate-pulse rounded-full bg-muted-foreground/15" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted/45" />
            </div>
            <div className="grid gap-1 pl-8">
              {[0, 1, 2].map((sessionIndex) => (
                <div className="flex items-center gap-2 rounded-lg py-1" key={sessionIndex}>
                  <div className="h-3 w-3 animate-pulse rounded-full bg-muted-foreground/20" />
                  <div className="h-3 flex-1 animate-pulse rounded-full bg-muted-foreground/15" />
                  <div className="h-7 w-7 animate-pulse rounded-md bg-muted/45" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
