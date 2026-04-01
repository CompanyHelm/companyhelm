import { MessageSquareTextIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ConversationListRecord = {
  createdAt: string;
  id: string;
  latestMessageAt: string | null;
  latestMessagePreview: string | null;
  participants: Array<{
    agentId: string;
    agentName: string;
    id: string;
    sessionId: string;
    sessionTitle: string;
  }>;
  updatedAt: string;
};

type ConversationListProperties = {
  conversations: ConversationListRecord[];
  onSelect: (conversationId: string) => void;
  selectedConversationId?: string;
};

function formatConversationTimestamp(conversation: ConversationListRecord): string {
  const timestamp = conversation.latestMessageAt ?? conversation.updatedAt ?? conversation.createdAt;
  return new Date(timestamp).toLocaleString();
}

function formatConversationTitle(conversation: ConversationListRecord): string {
  const agentNames = [...new Set(conversation.participants.map((participant) => participant.agentName))];
  if (agentNames.length === 0) {
    return "Untitled conversation";
  }

  return agentNames.join(" / ");
}

function formatConversationSessions(conversation: ConversationListRecord): string {
  return conversation.participants.map((participant) => participant.sessionTitle).join(" · ");
}

export function ConversationList(properties: ConversationListProperties) {
  if (properties.conversations.length === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/10 px-4 text-center">
        <div className="grid gap-2">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full border border-border/70 bg-background">
            <MessageSquareTextIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="text-sm font-medium text-foreground">No agent conversations yet</div>
          <div className="max-w-xs text-xs text-muted-foreground">
            Agent-to-agent threads will appear here after an agent uses the send_agent_message tool.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {properties.conversations.map((conversation) => {
        const isSelected = properties.selectedConversationId === conversation.id;

        return (
          <button
            key={conversation.id}
            className={cn(
              "grid w-full gap-2 rounded-xl border px-4 py-3 text-left transition",
              isSelected
                ? "border-primary/50 bg-primary/10 shadow-sm"
                : "border-border/60 bg-card hover:border-border hover:bg-muted/30",
            )}
            onClick={() => {
              properties.onSelect(conversation.id);
            }}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">
                  {formatConversationTitle(conversation)}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {formatConversationSessions(conversation)}
                </div>
              </div>
              <div className="shrink-0 text-[11px] text-muted-foreground">
                {formatConversationTimestamp(conversation)}
              </div>
            </div>
            <div className="line-clamp-2 text-xs text-muted-foreground">
              {conversation.latestMessagePreview ?? "No messages yet."}
            </div>
          </button>
        );
      })}
    </div>
  );
}
