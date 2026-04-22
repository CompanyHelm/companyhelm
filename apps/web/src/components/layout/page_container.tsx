import { Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { fetchQuery, graphql, useLazyLoadQuery, useMutation, useRelayEnvironment } from "react-relay";
import { ApplicationBreadcrumbProvider } from "@/components/layout/application_breadcrumb_context";
import { ApplicationHeader } from "@/components/layout/application_header";
import { ApplicationSidebar, type ApplicationSidebarOnboardingFocus } from "@/components/layout/application_sidebar";
import { ErrorBoundary } from "@/components/error_boundary";
import { ErrorState } from "@/components/error_state";
import { OrganizationPath } from "@/lib/organization_path";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { pageContainerCompanyOnboardingQuery } from "./__generated__/pageContainerCompanyOnboardingQuery.graphql";
import type { pageContainerEnsureCompanyOnboardingMutation } from "./__generated__/pageContainerEnsureCompanyOnboardingMutation.graphql";
import type { pageContainerSkipCompanyOnboardingMutation } from "./__generated__/pageContainerSkipCompanyOnboardingMutation.graphql";

interface PageContainerProps {
  children: ReactNode;
}

const pageContainerCompanyOnboardingQueryNode = graphql`
  query pageContainerCompanyOnboardingQuery {
    Me {
      company {
        id
        onboarding {
          id
          companyId
          status
          agentId
          sessionId
          workflowRunId
          updatedAt
        }
      }
    }
  }
`;

const pageContainerEnsureCompanyOnboardingMutationNode = graphql`
  mutation pageContainerEnsureCompanyOnboardingMutation {
    EnsureCompanyOnboarding {
      id
      companyId
      status
      agentId
      sessionId
      workflowRunId
      updatedAt
    }
  }
`;

const pageContainerSkipCompanyOnboardingMutationNode = graphql`
  mutation pageContainerSkipCompanyOnboardingMutation {
    SkipCompanyOnboarding {
      id
      companyId
      status
      agentId
      sessionId
      workflowRunId
      updatedAt
    }
  }
`;

export function PageContainer(props: PageContainerProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const locationHref = useRouterState({
    select: (state) => state.location.href,
  });
  const isOrganizationScopedPage = pathname.startsWith("/orgs/");

  if (!isOrganizationScopedPage) {
    // Routes outside the org slug prefix cannot rely on org-aware chrome like the sidebar/header.
    return (
      <div className="flex min-h-svh flex-col px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-5 lg:px-8">
        {props.children}
      </div>
    );
  }

  return (
    <Suspense fallback={<PageContainerOrganizationFallback />}>
      <PageContainerOrganizationShell pathname={pathname} locationHref={locationHref}>
        {props.children}
      </PageContainerOrganizationShell>
    </Suspense>
  );
}

function PageContainerOrganizationShell(props: PageContainerProps & {
  locationHref: string;
  pathname: string;
}) {
  const navigate = useNavigate();
  const relayEnvironment = useRelayEnvironment();
  const organizationSlug = props.pathname.split("/")[2] ?? "";
  const data = useLazyLoadQuery<pageContainerCompanyOnboardingQuery>(
    pageContainerCompanyOnboardingQueryNode,
    {},
    {
      fetchPolicy: "store-or-network",
    },
  );
  const [commitEnsureCompanyOnboarding, isEnsureCompanyOnboardingInFlight] =
    useMutation<pageContainerEnsureCompanyOnboardingMutation>(
      pageContainerEnsureCompanyOnboardingMutationNode,
    );
  const [commitSkipCompanyOnboarding, isSkipCompanyOnboardingInFlight] =
    useMutation<pageContainerSkipCompanyOnboardingMutation>(
      pageContainerSkipCompanyOnboardingMutationNode,
    );
  const [onboardingErrorMessage, setOnboardingErrorMessage] = useState<string | null>(null);
  const ensureRequestKeyRef = useRef<string | null>(null);
  const onboarding = data.Me.company.onboarding;
  const needsOnboardingStart = onboarding.status === "not_started"
    || (onboarding.status === "in_progress" && (!onboarding.agentId || !onboarding.sessionId));
  const isOnboardingFocused = onboarding.status === "not_started" || onboarding.status === "in_progress";
  const normalizedPathname = OrganizationPath.stripPrefix(props.pathname);
  const isChatsPage = normalizedPathname.startsWith("/chats");
  const isConversationsPage = normalizedPathname.startsWith("/conversations");
  const currentLocation = new URL(props.locationHref, "https://companyhelm.local");
  const tasksViewType = currentLocation.searchParams.get("viewType");
  const currentSessionId = currentLocation.searchParams.get("sessionId");
  const currentAgentId = currentLocation.searchParams.get("agentId");
  const isTasksBoardPage = normalizedPathname === "/tasks" && tasksViewType !== "list";
  const isFullHeightPage = isChatsPage || isConversationsPage || isTasksBoardPage;
  const onboardingFocus: ApplicationSidebarOnboardingFocus | null = isOnboardingFocused
    ? {
        agentId: onboarding.agentId ?? null,
        isSkipInFlight: isSkipCompanyOnboardingInFlight,
        onSkip: () => {
          setOnboardingErrorMessage(null);
          commitSkipCompanyOnboarding({
            variables: {},
            onCompleted: (response, errors) => {
              const nextErrorMessage = String(errors?.[0]?.message || "").trim();
              if (nextErrorMessage.length > 0) {
                setOnboardingErrorMessage(nextErrorMessage);
                return;
              }
              if (!response.SkipCompanyOnboarding) {
                setOnboardingErrorMessage("Failed to skip company onboarding.");
                return;
              }

              void navigate({
                params: {
                  organizationSlug,
                },
                to: OrganizationPath.route("/"),
              });
            },
            onError: (error) => {
              setOnboardingErrorMessage(error.message || "Failed to skip company onboarding.");
            },
          });
        },
        sessionId: onboarding.sessionId ?? null,
      }
    : null;
  const contentNode = onboardingErrorMessage
    ? (
        <div className="flex flex-1 items-center justify-center">
          <ErrorState
            actionLabel="Try again"
            className="w-full max-w-2xl rounded-lg border border-border/70 bg-card/80 px-6 py-6 shadow-sm"
            message={onboardingErrorMessage}
            onAction={() => setOnboardingErrorMessage(null)}
            title="Onboarding action failed"
          />
        </div>
      )
    : needsOnboardingStart || isEnsureCompanyOnboardingInFlight
      ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-2xl rounded-lg border border-border/70 bg-card/80 px-6 py-6 text-sm text-muted-foreground shadow-sm">
              Preparing the CEO onboarding chat for this company.
            </div>
          </div>
      )
      : props.children;

  useEffect(() => {
    if (!needsOnboardingStart || isEnsureCompanyOnboardingInFlight) {
      return;
    }

    const requestKey = `${onboarding.companyId}:${onboarding.status}:${onboarding.updatedAt}`;
    if (ensureRequestKeyRef.current === requestKey) {
      return;
    }

    ensureRequestKeyRef.current = requestKey;
    setOnboardingErrorMessage(null);
    commitEnsureCompanyOnboarding({
      variables: {},
      onCompleted: (response, errors) => {
        const nextErrorMessage = String(errors?.[0]?.message || "").trim();
        if (nextErrorMessage.length > 0) {
          ensureRequestKeyRef.current = null;
          setOnboardingErrorMessage(nextErrorMessage);
          return;
        }

        const ensuredOnboarding = response.EnsureCompanyOnboarding;
        if (!ensuredOnboarding.agentId || !ensuredOnboarding.sessionId) {
          ensureRequestKeyRef.current = null;
          setOnboardingErrorMessage("Company onboarding did not return a CEO chat.");
          return;
        }

        void navigate({
          params: {
            organizationSlug,
          },
          replace: true,
          search: {
            agentId: ensuredOnboarding.agentId,
            sessionId: ensuredOnboarding.sessionId,
          },
          to: OrganizationPath.route("/chats"),
        });
      },
      onError: (error) => {
        ensureRequestKeyRef.current = null;
        setOnboardingErrorMessage(error.message || "Failed to start company onboarding.");
      },
    });
  }, [
    commitEnsureCompanyOnboarding,
    isEnsureCompanyOnboardingInFlight,
    navigate,
    needsOnboardingStart,
    onboarding.companyId,
    onboarding.status,
    onboarding.updatedAt,
    organizationSlug,
  ]);

  useEffect(() => {
    if (onboarding.status !== "in_progress" || !onboarding.agentId || !onboarding.sessionId) {
      return;
    }
    if (normalizedPathname.startsWith("/inbox") || normalizedPathname.startsWith("/settings")) {
      return;
    }

    if (
      normalizedPathname.startsWith("/chats")
      && currentSessionId === onboarding.sessionId
      && currentAgentId === onboarding.agentId
    ) {
      return;
    }

    void navigate({
      params: {
        organizationSlug,
      },
      replace: true,
      search: {
        agentId: onboarding.agentId,
        sessionId: onboarding.sessionId,
      },
      to: OrganizationPath.route("/chats"),
    });
  }, [
    currentAgentId,
    currentSessionId,
    navigate,
    normalizedPathname,
    onboarding.agentId,
    onboarding.sessionId,
    onboarding.status,
    organizationSlug,
  ]);

  useEffect(() => {
    if (onboarding.status !== "in_progress") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchQuery<pageContainerCompanyOnboardingQuery>(
        relayEnvironment,
        pageContainerCompanyOnboardingQueryNode,
        {},
        {
          fetchPolicy: "network-only",
        },
      ).toPromise().catch(() => undefined);
    }, 10_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [onboarding.status, relayEnvironment]);

  const locationKey = props.locationHref;
  return (
    <ApplicationBreadcrumbProvider>
      <SidebarProvider defaultOpen>
        <ApplicationSidebar onboardingFocus={onboardingFocus} />
        <SidebarInset
          className={cn(
            "min-h-svh",
            isFullHeightPage && "h-svh min-h-0 max-h-svh overflow-hidden md:peer-data-[variant=inset]:my-0",
          )}
        >
          <ApplicationHeader />
          <div
            className={cn(
              "flex flex-1 flex-col",
              (isChatsPage || isConversationsPage)
                ? "min-h-0 overflow-hidden px-0 pb-0 pt-0"
                : isTasksBoardPage
                  ? "min-h-0 overflow-hidden px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-4 lg:px-5"
                : "px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-5 lg:px-8",
            )}
          >
            <ErrorBoundary
              boundaryKey={locationKey}
              fallback={({ error, reset }) => (
                <div className="flex flex-1 items-center justify-center">
                  <ErrorState
                    actionLabel="Try again"
                    className="w-full max-w-2xl rounded-lg border border-border/70 bg-card/80 px-6 py-6 shadow-sm"
                    message={error.message || "An unexpected error interrupted this page."}
                    onAction={reset}
                    title="Unable to load this page"
                  />
                </div>
              )}
            >
              {contentNode}
            </ErrorBoundary>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ApplicationBreadcrumbProvider>
  );
}

function PageContainerOrganizationFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-6">
      <div className="w-full max-w-2xl rounded-lg border border-border/70 bg-card/80 px-6 py-6 text-sm text-muted-foreground shadow-sm">
        Loading company workspace.
      </div>
    </div>
  );
}
