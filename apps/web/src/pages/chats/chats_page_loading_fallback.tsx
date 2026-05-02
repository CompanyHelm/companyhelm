/**
 * Renders the Suspense fallback for the chats page in the same spatial order as
 * the loaded experience so the temporary state does not jump or imply an empty
 * chat list while Relay fetches the initial workspace data.
 */
export function ChatsPageFallback() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading chats"
      className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row"
    >
      <span className="sr-only">Loading chats</span>

      <section
        aria-hidden="true"
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border-0 bg-transparent !pb-px shadow-none ring-0"
        data-testid="chats-loading-transcript"
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pl-1 pr-0 pt-0 pb-0 md:pl-4">
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

          <div className="shrink-0 px-2 pb-3 md:px-3">
            <div className="rounded-2xl border border-border/60 bg-background/85 p-3 shadow-sm">
              <div className="h-20 w-full animate-pulse rounded-xl bg-muted/45" />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-muted/60" />
                  <div className="h-8 w-32 animate-pulse rounded-full bg-muted/60" />
                </div>
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted/60" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside
        aria-hidden="true"
        className="relative hidden min-h-0 w-full overflow-hidden lg:block lg:w-[22rem] lg:shrink-0"
        data-testid="chats-loading-list"
      >
        <div className="flex h-full min-h-0 flex-col px-3 md:px-4">
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
      </aside>
    </main>
  );
}
