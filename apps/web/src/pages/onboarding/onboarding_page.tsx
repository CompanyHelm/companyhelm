import { Suspense, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { fetchQuery, graphql, useLazyLoadQuery, useMutation, useRelayEnvironment } from "react-relay";
import { Button } from "@/components/ui/button";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { ChatsPageContent } from "@/pages/chats/chats_page_content";
import type { onboardingPageEnsureCompanyOnboardingMutation } from "./__generated__/onboardingPageEnsureCompanyOnboardingMutation.graphql";
import type { onboardingPageQuery } from "./__generated__/onboardingPageQuery.graphql";

const onboardingPageQueryNode = graphql`
  query onboardingPageQuery {
    Me {
      company {
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

const onboardingPageEnsureCompanyOnboardingMutationNode = graphql`
  mutation onboardingPageEnsureCompanyOnboardingMutation {
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

export function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingPageLoadingState />}>
      <OnboardingPageContent />
    </Suspense>
  );
}

function OnboardingPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const relayEnvironment = useRelayEnvironment();
  const data = useLazyLoadQuery<onboardingPageQuery>(
    onboardingPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitEnsureCompanyOnboarding, isEnsureCompanyOnboardingInFlight] =
    useMutation<onboardingPageEnsureCompanyOnboardingMutation>(
      onboardingPageEnsureCompanyOnboardingMutationNode,
    );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const ensureRequestKeyRef = useRef<string | null>(null);
  const onboarding = data.Me.company.onboarding;
  const needsOnboardingStart = onboarding.status === "not_started"
    || (onboarding.status === "in_progress" && (!onboarding.agentId || !onboarding.sessionId));

  useEffect(() => {
    if (errorMessage || !needsOnboardingStart || isEnsureCompanyOnboardingInFlight) {
      return;
    }

    const requestKey = `${onboarding.companyId}:${onboarding.status}:${onboarding.updatedAt}`;
    if (ensureRequestKeyRef.current === requestKey) {
      return;
    }

    ensureRequestKeyRef.current = requestKey;
    setErrorMessage(null);
    commitEnsureCompanyOnboarding({
      variables: {},
      onCompleted: (response, errors) => {
        const nextErrorMessage = String(errors?.[0]?.message || "").trim();
        if (nextErrorMessage.length > 0) {
          ensureRequestKeyRef.current = null;
          setErrorMessage(nextErrorMessage);
          return;
        }

        const ensuredOnboarding = response.EnsureCompanyOnboarding;
        if (!ensuredOnboarding.agentId || !ensuredOnboarding.sessionId) {
          ensureRequestKeyRef.current = null;
          setErrorMessage("Company onboarding did not return a CEO chat.");
        }
      },
      onError: (error) => {
        ensureRequestKeyRef.current = null;
        setErrorMessage(error.message || "Failed to start company onboarding.");
      },
    });
  }, [
    commitEnsureCompanyOnboarding,
    errorMessage,
    isEnsureCompanyOnboardingInFlight,
    needsOnboardingStart,
    onboarding.companyId,
    onboarding.status,
    onboarding.updatedAt,
  ]);

  useEffect(() => {
    if (onboarding.status !== "in_progress") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchQuery<onboardingPageQuery>(
        relayEnvironment,
        onboardingPageQueryNode,
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

  if (errorMessage) {
    return (
      <OnboardingPageMessageState
        actionLabel="Try again"
        message={errorMessage}
        onAction={() => setErrorMessage(null)}
        title="Onboarding failed"
      />
    );
  }

  if (onboarding.status === "completed") {
    return (
      <OnboardingPageMessageState
        actionLabel="Open dashboard"
        icon={<CheckCircle2Icon className="size-5 text-emerald-500" />}
        message="The company setup workflow has been completed."
        onAction={() => {
          void navigate({
            params: {
              organizationSlug,
            },
            to: OrganizationPath.route("/"),
          });
        }}
        title="Company setup complete"
      />
    );
  }

  if (onboarding.status === "skipped") {
    return (
      <OnboardingPageMessageState
        actionLabel="Open dashboard"
        message="Company setup was skipped for this workspace."
        onAction={() => {
          void navigate({
            params: {
              organizationSlug,
            },
            to: OrganizationPath.route("/"),
          });
        }}
        title="Company setup skipped"
      />
    );
  }

  if (onboarding.status === "in_progress" && onboarding.agentId && onboarding.sessionId) {
    return (
      <ChatsPageContent
        canForkLatestSession={false}
        headerSubtitle="CEO setup workflow"
        headerTitle="Company onboarding"
        routePath="/onboarding"
        selectedAgentId={onboarding.agentId}
        selectedSessionId={onboarding.sessionId}
        showChatList={false}
        showSettingsButton={false}
      />
    );
  }

  return <OnboardingPageLoadingState />;
}

function OnboardingPageLoadingState() {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4">
      <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <Loader2Icon className="size-4 animate-spin" />
        <span>Preparing the CEO onboarding chat.</span>
      </div>
    </div>
  );
}

function OnboardingPageMessageState(props: {
  actionLabel: string;
  icon?: ReactNode;
  message: string;
  onAction(): void;
  title: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-lg border border-border/70 bg-card/80 px-5 py-5 shadow-sm">
        <div className="flex items-start gap-3">
          {props.icon ? (
            <div className="mt-0.5 shrink-0">{props.icon}</div>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{props.title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{props.message}</p>
            <Button className="mt-4" onClick={props.onAction} size="sm" type="button">
              {props.actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
