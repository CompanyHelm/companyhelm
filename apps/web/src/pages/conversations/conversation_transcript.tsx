import { MessageSquareTextIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  messages: ConversationMessageRecord[];
};

function formatMessageTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
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
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {properties.messages.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 text-center text-xs text-muted-foreground">
            No canonical messages have been persisted for this conversation yet.
          </div>
        ) : (
          properties.messages.map((message) => (
            <div key={message.id} className="grid gap-2 rounded-xl border border-border/60 bg-card px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-medium text-foreground">
                  {message.authorAgentName}
                </div>
                <div className="text-muted-foreground">
                  {formatMessageTimestamp(message.createdAt)}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Session: {message.authorSessionTitle}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                {message.text}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
