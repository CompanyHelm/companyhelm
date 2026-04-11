import { MessageSquareTextIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { ConversationDeleteAction } from "./conversation_delete_action";

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
  deletingConversationId?: string | null;
  emptyStateTone?: "desktop" | "mobile";
  onDeleteConversation?: (conversationId: string) => Promise<void> | void;
  onSelect: (conversationId: string) => void;
  selectedConversationId?: string;
  tone?: "desktop" | "mobile";
};

function formatConversationListTimestamp(value?: string | null): string {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "";
  }

  const now = new Date();
  const isSameDay =
    now.getFullYear() === timestamp.getFullYear()
    && now.getMonth() === timestamp.getMonth()
    && now.getDate() === timestamp.getDate();

  return new Intl.DateTimeFormat("en-US", isSameDay
    ? {
      hour: "numeric",
      minute: "2-digit",
    }
    : {
      day: "numeric",
      month: "short",
    }).format(timestamp);
}

function resolveConversationTitle(conversation: ConversationListRecord): string {
  const names = conversation.participants
    .map((participant) => participant.agentName.trim())
    .filter((name) => name.length > 0);

  return names.length > 0 ? names.join(" / ") : "Untitled conversation";
}

function resolveConversationSubtitle(conversation: ConversationListRecord): string {
  const sessionTitles = conversation.participants
    .map((participant) => participant.sessionTitle.trim())
    .filter((sessionTitle) => sessionTitle.length > 0);

  return sessionTitles.length > 0 ? sessionTitles.join(" · ") : "No session titles";
}

function resolveConversationPreview(conversation: ConversationListRecord): string {
  const preview = conversation.latestMessagePreview?.trim();
  if (preview && preview.length > 0) {
    return preview;
  }

  return "No canonical messages have been persisted yet.";
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
        const isDeletingConversation = properties.deletingConversationId === conversation.id;
        const title = resolveConversationTitle(conversation);
        const subtitle = resolveConversationSubtitle(conversation);
        const preview = resolveConversationPreview(conversation);
        const timestampLabel = formatConversationListTimestamp(
          conversation.latestMessageAt ?? conversation.updatedAt ?? conversation.createdAt,
        );

        return (
          <div
            key={conversation.id}
            className={cn(
              "flex items-start gap-2 rounded-2xl border px-3 py-3 transition",
              tone === "mobile"
                ? isSelected
                  ? "border-sidebar-border bg-sidebar-accent"
                  : "border-sidebar-border/60 bg-sidebar/60 hover:bg-sidebar-accent/70"
                : isSelected
                  ? "border-border/80 bg-card shadow-sm"
                  : "border-border/60 bg-background/70 hover:border-border/80 hover:bg-muted/20",
            )}
          >
            <button
              className="min-w-0 flex-1 text-left"
              disabled={isDeletingConversation}
              onClick={() => {
                properties.onSelect(conversation.id);
              }}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className={cn(
                      "truncate text-sm font-semibold",
                      tone === "mobile" ? "text-sidebar-foreground" : "text-foreground",
                    )}
                  >
                    {title}
                  </div>
                  <div
                    className={cn(
                      "mt-1 truncate text-xs",
                      tone === "mobile" ? "text-sidebar-foreground/65" : "text-muted-foreground",
                    )}
                  >
                    {subtitle}
                  </div>
                </div>
                {timestampLabel ? (
                  <div
                    className={cn(
                      "shrink-0 text-[11px] font-medium uppercase tracking-[0.14em]",
                      tone === "mobile" ? "text-sidebar-foreground/55" : "text-muted-foreground",
                    )}
                  >
                    {timestampLabel}
                  </div>
                ) : null}
              </div>
              <div
                className={cn(
                  "mt-3 line-clamp-2 text-xs leading-5",
                  tone === "mobile" ? "text-sidebar-foreground/75" : "text-muted-foreground",
                )}
              >
                {preview}
              </div>
            </button>
            {properties.onDeleteConversation ? (
              <ConversationDeleteAction
                buttonClassName={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
                  tone === "mobile"
                    ? "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                buttonTitle={isDeletingConversation ? "Deleting conversation..." : "Delete conversation"}
                conversationLabel={title}
                isDeleting={isDeletingConversation}
                onDelete={() => properties.onDeleteConversation?.(conversation.id)}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
