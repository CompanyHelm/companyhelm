import type { MutableRefObject, UIEvent } from "react";
import { Loader2Icon, MessageSquareTextIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { ConversationListRecord } from "./conversation_list";

export type ConversationMessageRecord = {
  authorAgentId: string;
  authorAgentName: string;
  authorParticipantId: string;
  authorSessionId: string;
  authorSessionTitle: string;
  conversationId: string;
  createdAt: string;
  id: string;
  text: string;
};

type ConversationTranscriptProperties = {
  conversation: ConversationListRecord | null;
  errorMessage?: string | null;
  isLoadingOlderMessages: boolean;
  isLoadingTranscript: boolean;
  messages: ConversationMessageRecord[];
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  transcriptScrollRef: MutableRefObject<HTMLDivElement | null>;
};

function formatMessageTimestamp(timestamp: string): string {
  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(value);
}

function ConversationTranscriptBubble({
  isPrimaryParticipant,
  message,
}: {
  isPrimaryParticipant: boolean;
  message: ConversationMessageRecord;
}) {
  return (
    <div
      data-conversation-message-id={message.id}
      className={cn("flex w-full", isPrimaryParticipant ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "grid max-w-[82%] gap-2 rounded-2xl border px-4 py-3 shadow-sm",
          isPrimaryParticipant
            ? "border-primary/20 bg-primary text-primary-foreground"
            : "border-border/60 bg-card text-foreground",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em]">
          <div className={cn("font-semibold", isPrimaryParticipant ? "text-primary-foreground/85" : "text-muted-foreground")}>
            {message.authorAgentName}
          </div>
          <div className={cn(isPrimaryParticipant ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {formatMessageTimestamp(message.createdAt)}
          </div>
        </div>
        <div className={cn("text-[11px]", isPrimaryParticipant ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {message.authorSessionTitle}
        </div>
        <div
          className={cn(
            "whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]",
            isPrimaryParticipant ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {message.text}
        </div>
      </div>
    </div>
  );
}

export function ConversationTranscript(properties: ConversationTranscriptProperties) {
  if (!properties.conversation) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/60 bg-muted/10 px-6 text-center">
        <div className="grid gap-2">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full border border-border/70 bg-background">
            <MessageSquareTextIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="text-sm font-medium text-foreground">Select an agent conversation</div>
          <div className="max-w-sm text-xs text-muted-foreground">
            Choose an agent-to-agent thread from the right to inspect the canonical conversation transcript.
          </div>
        </div>
      </div>
    );
  }

  const primaryParticipantId = properties.conversation.participants[0]?.id ?? null;
  const showTranscriptLoader = properties.isLoadingTranscript || properties.isLoadingOlderMessages;
  const hasMessages = properties.messages.length > 0;

  return (
    <Card className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border/60 shadow-sm">
      <CardHeader className="shrink-0 gap-3 border-b border-border/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-2">
            <CardTitle className="text-base font-semibold">
              {properties.conversation.participants.map((participant) => participant.agentName).join(" / ")}
            </CardTitle>
            <CardDescription>
              {properties.conversation.participants.map((participant) => participant.sessionTitle).join(" · ")}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {properties.conversation.participants.map((participant) => (
              <Badge key={participant.id} variant="secondary">
                {participant.agentName}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <div
          ref={properties.transcriptScrollRef}
          className="no-scrollbar flex h-full min-h-0 flex-col gap-3 overflow-y-auto px-4 py-4 [overflow-anchor:none]"
          onScroll={properties.onScroll}
        >
          {showTranscriptLoader ? (
            <div className="flex h-9 shrink-0 items-end justify-center pt-2">
              <Loader2Icon aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          {properties.errorMessage ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {properties.errorMessage}
            </div>
          ) : null}
          {!hasMessages && !showTranscriptLoader ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 text-center text-xs text-muted-foreground">
              No canonical messages have been persisted for this conversation yet.
            </div>
          ) : (
            properties.messages.map((message) => (
              <ConversationTranscriptBubble
                isPrimaryParticipant={message.authorParticipantId === primaryParticipantId}
                key={message.id}
                message={message}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
