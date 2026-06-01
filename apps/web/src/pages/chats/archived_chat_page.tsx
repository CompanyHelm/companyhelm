import { Suspense, useMemo, useState } from "react";
import type { UIEvent } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArchiveIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useRelayEnvironment } from "react-relay";
import { useApplicationHeader } from "@/components/layout/application_breadcrumb_context";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { ChatTranscriptLoadingSkeleton } from "./chat_transcript_loading_skeleton";
import { ChatTranscriptPane } from "./chat_transcript_pane";
import type { archivedChatPageQuery } from "./__generated__/archivedChatPageQuery.graphql";
import type { SessionRecord } from "./chats_page_data";
import { resolveSessionTitle } from "./chats_page_helpers";
import { useArchivedChatTranscript } from "./use_archived_chat_transcript";

const archivedChatPageQueryNode = graphql`
  query archivedChatPageQuery($sessionId: ID!) {
    ArchivedSession(sessionId: $sessionId) {
      ...chatsPageDataChatTranscriptPaneSessionFragment @relay(mask: false)
      id
      agentId
      status
      updatedAt
    }
    Agents {
      id
      name
      title
    }
  }
`;

function ArchivedChatFallback() {
  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border-0 bg-transparent shadow-none ring-0">
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 pt-0 pb-0 md:px-4">
          <ChatTranscriptLoadingSkeleton />
        </CardContent>
      </Card>
    </main>
  );
}

function ArchivedChatReadOnlyBanner() {
  return (
    <div className="shrink-0 px-2 pt-4 md:px-4 md:pt-5">
      <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
        <ArchiveIcon className="mt-0.5 size-4 shrink-0 text-foreground/70" />
        <div className="min-w-0">
          <p className="font-medium text-foreground">Archived chat</p>
          <p className="mt-1 text-xs/relaxed">
            This transcript is read-only. Restore it from the agent&apos;s archived chats tab before
            sending new messages or changing chat settings.
          </p>
        </div>
      </div>
    </div>
  );
}

function ArchivedChatPageContent() {
  const { sessionId } = useParams({ strict: false }) as { sessionId?: string };
  const organizationSlug = useCurrentOrganizationSlug();
  const relayEnvironment = useRelayEnvironment();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const queryData = useLazyLoadQuery<archivedChatPageQuery>(
    archivedChatPageQueryNode,
    {
      sessionId: sessionId ?? "",
    },
    {
      fetchPolicy: "store-and-network",
    },
  );
  const archivedSession = queryData.ArchivedSession as unknown as SessionRecord;
  const archivedAgent = queryData.Agents.find((agent) => agent.id === archivedSession.agentId) ?? null;
  const {
    handleTranscriptScroll,
    handleTranscriptWheel,
    isTranscriptStuckToBottom,
    isLoadingTranscript,
    jumpToLatestMessage,
    transcriptMessages,
    transcriptScrollRef,
  } = useArchivedChatTranscript({
    environment: relayEnvironment,
    selectedSession: archivedSession,
    setErrorMessage,
  });
  const archivedSessionTitle = resolveSessionTitle(archivedSession, transcriptMessages);
  const archivedAgentId = archivedAgent?.id ?? null;
  const archivedAgentName = archivedAgent?.name ?? null;
  const headerContent = useMemo(() => {
    return (
      <div className="grid min-w-0 gap-1">
        <Breadcrumb>
          <BreadcrumbList className="min-w-0">
            <BreadcrumbItem>
              <Link
                className="font-medium text-muted-foreground transition hover:text-foreground"
                params={{ organizationSlug }}
                to={OrganizationPath.route("/agents")}
              >
                Agents
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {archivedAgentId ? (
              <>
                <BreadcrumbItem className="min-w-0">
                  <Link
                    className="truncate font-medium text-muted-foreground transition hover:text-foreground"
                    params={{
                      agentId: archivedAgentId,
                      organizationSlug,
                    }}
                    to={OrganizationPath.route("/agents/$agentId")}
                  >
                    {archivedAgentName ?? archivedAgentId}
                  </Link>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <Link
                    className="font-medium text-muted-foreground transition hover:text-foreground"
                    params={{
                      agentId: archivedAgentId,
                      organizationSlug,
                    }}
                    search={{ tab: "archived" }}
                    to={OrganizationPath.route("/agents/$agentId")}
                  >
                    Archived chats
                  </Link>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            ) : null}
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate">{archivedSessionTitle}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  }, [archivedAgentId, archivedAgentName, archivedSessionTitle, organizationSlug]);
  useApplicationHeader({
    className: "min-h-12",
    content: headerContent,
  });

  return (
    <main className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border-0 bg-transparent !pb-px shadow-none ring-0">
        <ArchivedChatReadOnlyBanner />
        {errorMessage ? (
          <div className="shrink-0 px-2 pt-3 md:px-4">
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          </div>
        ) : null}
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pl-1 pr-0 pt-0 pb-0 md:pl-4 md:pt-0 md:pb-0">
          <ChatTranscriptPane
            isTranscriptStuckToBottom={isTranscriptStuckToBottom}
            isLoadingOlderMessages={false}
            isLoadingTranscript={isLoadingTranscript}
            onJumpToLatest={jumpToLatestMessage}
            onScroll={handleTranscriptScroll as (event: UIEvent<HTMLDivElement>) => void}
            onWheelCapture={handleTranscriptWheel}
            onSwitchCybersecurityRiskModel={null}
            organizationSlug={organizationSlug}
            session={archivedSession}
            sessionMessages={transcriptMessages}
            transcriptScrollRef={transcriptScrollRef}
          />
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Displays an archived chat transcript without composer controls or mutation actions, giving users
 * a stable deep link for archived sessions that disappeared from the active chat workspace.
 */
export function ArchivedChatPage() {
  return (
    <Suspense fallback={<ArchivedChatFallback />}>
      <ArchivedChatPageContent />
    </Suspense>
  );
}
