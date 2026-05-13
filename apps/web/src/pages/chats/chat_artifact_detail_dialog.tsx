import { MarkdownContent } from "@/components/markdown_content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SessionArtifactRecord } from "./chats_page_data";

/**
 * Keeps markdown artifact reading inside the chats experience so operators can inspect generated
 * documents without losing the surrounding transcript and sidebar context.
 */
export function ChatArtifactDetailDialog({
  artifact,
  isOpen,
  onOpenChange,
}: {
  artifact: SessionArtifactRecord | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!artifact || artifact.type !== "markdown_document") {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,58rem)] max-w-[58rem]">
        <DialogHeader>
          <DialogTitle>{artifact.name}</DialogTitle>
          <DialogDescription>
            {artifact.description || "Session-generated document artifact."}
          </DialogDescription>
        </DialogHeader>
        <MarkdownContent
          className="rounded-xl border border-border/60 bg-muted/20 px-4 py-4"
          content={artifact.markdownContent || ""}
          emptyClassName="text-sm text-muted-foreground"
          emptyLabel="This document does not have any markdown content yet."
        />
      </DialogContent>
    </Dialog>
  );
}
