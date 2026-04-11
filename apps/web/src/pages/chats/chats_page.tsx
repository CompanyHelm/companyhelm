import { Suspense } from "react";
import { ChatsPageContent, ChatsPageFallback } from "./chats_page_content";

export function ChatsPage() {
  return (
    <Suspense fallback={<ChatsPageFallback />}>
      <ChatsPageContent />
    </Suspense>
  );
}
