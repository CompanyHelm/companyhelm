import React from "react";

import { ChatComposerLoadingSkeleton } from "./chat_composer_loading_skeleton";
import { ChatListLoadingSkeleton } from "./chat_list_loading_skeleton";
import { ChatTranscriptLoadingSkeleton } from "./chat_transcript_loading_skeleton";

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
          <ChatTranscriptLoadingSkeleton />

          <div className="shrink-0 px-2 pb-3 md:px-3">
            <ChatComposerLoadingSkeleton />
          </div>
        </div>
      </section>

      <aside
        aria-hidden="true"
        className="relative hidden min-h-0 w-full overflow-hidden lg:block lg:w-[22rem] lg:shrink-0"
        data-testid="chats-loading-list"
      >
        <ChatListLoadingSkeleton />
      </aside>
    </main>
  );
}
