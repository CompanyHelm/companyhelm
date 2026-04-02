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
  emptyStateTone?: "desktop" | "mobile";
  onSelect: (conversationId: string) => void;
  selectedConversationId?: string;
  tone?: "desktop" | "mobile";
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
  const tone = properties.tone ?? "desktop";
  const emptyStateTone = properties.emptyStateTone ?? tone;

  if (properties.conversations.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[280px] items-center justify-center rounded-xl border px-4 text-center",
          emptyStateTone === "mobile"
            ? "border-dashed border-sidebar-border bg-sidebar-accent/25"
            : "border-dashed border-border/60 bg-muted/10",
        )}
      >
        <div className="grid gap-2">
          <div
            className={cn(
              "mx-auto flex size-10 items-center justify-center rounded-full border",
              emptyStateTone === "mobile"
                ? "border-sidebar-border bg-sidebar"
                : "border-border/70 bg-background",
            )}
          >
            <MessageSquareTextIcon
              className={cn(
                "size-4",
                emptyStateTone === "mobile" ? "text-sidebar-foreground/70" : "text-muted-foreground",
              )}
            />
          </div>
          <div className={cn("text-sm font-medium", emptyStateTone === "mobile" ? "text-sidebar-foreground" : "text-foreground")}>
            No agent conversations yet
          </div>
          <div className={cn("max-w-xs text-xs", emptyStateTone === "mobile" ? "text-sidebar-foreground/65" : "text-muted-foreground")}>
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
              "grid w-full gap-2 rounded-xl px-3 py-3 text-left transition",
              tone === "mobile"
                ? isSelected
                  ? "bg-sidebar-accent"
                  : "bg-transparent hover:bg-sidebar-accent/70"
                : isSelected
                  ? "bg-muted/45"
                  : "bg-transparent hover:bg-muted/30",
            )}
            onClick={() => {
              properties.onSelect(conversation.id);
            }}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className={cn(
                    "truncate text-sm font-medium",
                    tone === "mobile" ? "text-sidebar-foreground" : "text-foreground",
                  )}
                >
                  {formatConversationTitle(conversation)}
                </div>
                <div
                  className={cn(
                    "truncate text-xs",
                    tone === "mobile" ? "text-sidebar-foreground/65" : "text-muted-foreground",
                  )}
                >
                  {formatConversationSessions(conversation)}
                </div>
              </div>
              <div
                className={cn(
                  "shrink-0 text-[11px]",
                  tone === "mobile" ? "text-sidebar-foreground/55" : "text-muted-foreground",
                )}
              >
                {formatConversationTimestamp(conversation)}
              </div>
            </div>
            <div
              className={cn(
                "line-clamp-2 text-xs",
                tone === "mobile" ? "text-sidebar-foreground/60" : "text-muted-foreground",
              )}
            >
              {conversation.latestMessagePreview ?? "No messages yet."}
            </div>
          </button>
        );
      })}
    </div>
  );
}
