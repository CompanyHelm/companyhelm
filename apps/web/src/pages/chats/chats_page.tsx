import { Suspense } from "react";
import { ChatsPageContent } from "./chats_page_content";
import { ChatsPageFallback } from "./chats_page_loading_fallback";

export function ChatsPage() {
  return (
    <Suspense fallback={<ChatsPageFallback />}>
      <ChatsPageContent />
    </Suspense>
  );
}
