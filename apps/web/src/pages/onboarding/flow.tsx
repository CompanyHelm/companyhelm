import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { fetchQuery, graphql, useLazyLoadQuery, useMutation, useRelayEnvironment } from "react-relay";
import { Button } from "@/components/ui/button";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { CreateCredentialDialog } from "@/pages/model-provider-credentials/create_credential_dialog";
import { ModelProviderCredentialCatalog } from "@/pages/model-provider-credentials/provider_catalog";
import type { flowAddModelProviderCredentialMutation } from "./__generated__/flowAddModelProviderCredentialMutation.graphql";
import type { flowCreateGithubInstallationUrlMutation } from "./__generated__/flowCreateGithubInstallationUrlMutation.graphql";
import type { flowEnsureCompanyOnboardingMutation } from "./__generated__/flowEnsureCompanyOnboardingMutation.graphql";
import type { flowQuery } from "./__generated__/flowQuery.graphql";
import type { flowUpdateCompanyOnboardingMutation } from "./__generated__/flowUpdateCompanyOnboardingMutation.graphql";

const onboardingPageQueryNode = graphql`
  query flowQuery {
    Me {
      company {
        id
        onboarding {
          id
          companyId
          status
          companyMission
          missionSkippedAt
          githubSetupStatus
          githubCompletedAt
          githubSkippedAt
          llmSetupStatus
          llmCompletedAt
          llmSkippedAt
          agentId
          sessionId
          workflowRunId
          updatedAt
        }
      }
    }
    GithubInstallations {
      id
    }
    ModelProviders {
      id
      name
      type
      authorizationInstructionsMarkdown
    }
    ModelProviderCredentials {
      id
      name
      modelProvider
      baseUrl
      isManaged
    }
  }
`;

const onboardingPageEnsureCompanyOnboardingMutationNode = graphql`
  mutation flowEnsureCompanyOnboardingMutation {
    EnsureCompanyOnboarding {
      id
      companyId
      status
      companyMission
      missionSkippedAt
      githubSetupStatus
      githubCompletedAt
      githubSkippedAt
      llmSetupStatus
      llmCompletedAt
      llmSkippedAt
      agentId
      sessionId
      workflowRunId
      updatedAt
    }
  }
`;

const onboardingPageUpdateCompanyOnboardingMutationNode = graphql`
  mutation flowUpdateCompanyOnboardingMutation($input: UpdateCompanyOnboardingInput!) {
    UpdateCompanyOnboarding(input: $input) {
      id
      companyId
      status
      companyMission
      missionSkippedAt
      githubSetupStatus
      githubCompletedAt
      githubSkippedAt
      llmSetupStatus
      llmCompletedAt
      llmSkippedAt
      agentId
      sessionId
      workflowRunId
      updatedAt
    }
  }
`;

const onboardingPageCreateGithubInstallationUrlMutationNode = graphql`
  mutation flowCreateGithubInstallationUrlMutation($returnPath: String) {
    CreateGithubInstallationUrl(returnPath: $returnPath) {
      url
    }
  }
`;

const onboardingPageAddModelProviderCredentialMutationNode = graphql`
  mutation flowAddModelProviderCredentialMutation($input: AddModelProviderCredentialInput!) {
    AddModelProviderCredential(input: $input) {
      id
      name
      modelProvider
      baseUrl
      isManaged
    }
  }
`;

export type OnboardingStepKey = "mission" | "github" | "model-provider";

export interface OnboardingFlowController {
  credentialErrorMessage: string | null;
  errorMessage: string | null;
  githubResolved: boolean;
  hasGithubInstallation: boolean;
  hasManagedCredential: boolean;
  hasThirdPartyCredential: boolean;
  isAddModelProviderCredentialInFlight: boolean;
  isCreateGithubInstallationUrlInFlight: boolean;
  isCredentialDialogOpen: boolean;
  isEnsureCompanyOnboardingInFlight: boolean;
  isUpdateCompanyOnboardingInFlight: boolean;
  llmResolved: boolean;
  missionDraft: string;
  missionResolved: boolean;
  needsOnboardingStart: boolean;
  onboarding: flowQuery["response"]["Me"]["company"]["onboarding"];
  setupResolved: boolean;
  thirdPartyProviders: ReturnType<typeof ModelProviderCredentialCatalog.toDialogProviders>;
  clearErrorMessage(): void;
  createCredential(input: {
    accessToken?: string;
    accessTokenExpiresAtMilliseconds?: string;
    apiKey?: string;
    baseUrl?: string;
    isDefault?: boolean;
    modelProvider: string;
    name?: string;
    refreshToken?: string;
  }): Promise<void>;
  openGithubInstall(returnPath: string): void;
  setCredentialDialogOpen(open: boolean): void;
  setMissionDraft(value: string): void;
  updateOnboarding(input: {
    companyMission?: string | null;
    githubSetupStatus?: "completed" | "skipped";
    llmSetupStatus?: "third_party" | "company_managed" | "skipped";
    skipMission?: boolean | null;
  }): Promise<void>;
}

export function OnboardingPageSuspense(props: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<OnboardingPageLoadingState message="Loading company onboarding..." />}>
      {props.children}
    </Suspense>
  );
}

export function useOnboardingFlowController(options?: {
  ensureOnboardingStart?: boolean;
}): OnboardingFlowController {
  const relayEnvironment = useRelayEnvironment();
  const data = useLazyLoadQuery<flowQuery>(
    onboardingPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitEnsureCompanyOnboarding, isEnsureCompanyOnboardingInFlight] =
    useMutation<flowEnsureCompanyOnboardingMutation>(
      onboardingPageEnsureCompanyOnboardingMutationNode,
    );
  const [commitUpdateCompanyOnboarding, isUpdateCompanyOnboardingInFlight] =
    useMutation<flowUpdateCompanyOnboardingMutation>(
      onboardingPageUpdateCompanyOnboardingMutationNode,
    );
  const [commitCreateGithubInstallationUrl, isCreateGithubInstallationUrlInFlight] =
    useMutation<flowCreateGithubInstallationUrlMutation>(
      onboardingPageCreateGithubInstallationUrlMutationNode,
    );
  const [commitAddModelProviderCredential, isAddModelProviderCredentialInFlight] =
    useMutation<flowAddModelProviderCredentialMutation>(
      onboardingPageAddModelProviderCredentialMutationNode,
    );
  const [credentialErrorMessage, setCredentialErrorMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCredentialDialogOpen, setIsCredentialDialogOpen] = useState(false);
  const [missionDraft, setMissionDraft] = useState("");
  const ensureRequestKeyRef = useRef<string | null>(null);
  const onboarding = data.Me.company.onboarding;
  const missionResolved = Boolean(onboarding.companyMission) || Boolean(onboarding.missionSkippedAt);
  const githubResolved = onboarding.githubSetupStatus !== "pending";
  const llmResolved = onboarding.llmSetupStatus !== "pending";
  const setupResolved = missionResolved && githubResolved && llmResolved;
  const hasGithubInstallation = data.GithubInstallations.length > 0;
  const hasManagedCredential = data.ModelProviderCredentials.some((credential) => credential.isManaged);
  const hasThirdPartyCredential = data.ModelProviderCredentials.some((credential) => !credential.isManaged);
  const thirdPartyProviders = useMemo(() => {
    return ModelProviderCredentialCatalog.toDialogProviders(
      data.ModelProviders
        .filter((provider) => provider.id !== "companyhelm")
        .map((provider) => ({
          authorizationInstructionsMarkdown: provider.authorizationInstructionsMarkdown ?? null,
          id: provider.id,
          name: provider.name,
          type: provider.type === "oauth" ? "oauth" : "api_key",
        })),
    );
  }, [data.ModelProviders]);
  const needsOnboardingStart = setupResolved && (
    onboarding.status === "not_started"
    || (onboarding.status === "in_progress" && (!onboarding.agentId || !onboarding.sessionId))
  );

  useEffect(() => {
    setMissionDraft(onboarding.companyMission ?? "");
  }, [onboarding.companyMission]);

  useEffect(() => {
    if (!options?.ensureOnboardingStart || errorMessage || !needsOnboardingStart || isEnsureCompanyOnboardingInFlight) {
      return;
    }

    const requestKey = [
      onboarding.companyId,
      onboarding.status,
      onboarding.updatedAt,
      onboarding.githubSetupStatus,
      onboarding.llmSetupStatus,
      onboarding.companyMission ?? "",
    ].join(":");
    if (ensureRequestKeyRef.current === requestKey) {
      return;
    }

    // The root onboarding route can remount while the CEO chat is provisioning. This keeps the
    // ensure mutation idempotent from the client side so we do not create duplicate requests.
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
    onboarding.companyMission,
    onboarding.githubSetupStatus,
    onboarding.llmSetupStatus,
    onboarding.status,
    onboarding.updatedAt,
    options?.ensureOnboardingStart,
  ]);

  useEffect(() => {
    if (onboarding.status !== "in_progress") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void fetchQuery<flowQuery>(
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

  async function updateOnboarding(input: {
    companyMission?: string | null;
    githubSetupStatus?: "completed" | "skipped";
    llmSetupStatus?: "third_party" | "company_managed" | "skipped";
    skipMission?: boolean | null;
  }): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      commitUpdateCompanyOnboarding({
        variables: {
          input,
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage.length > 0) {
            reject(new Error(nextErrorMessage));
            return;
          }

          resolve();
        },
        onError: reject,
      });
    });
  }

  async function createCredential(input: {
    accessToken?: string;
    accessTokenExpiresAtMilliseconds?: string;
    apiKey?: string;
    baseUrl?: string;
    isDefault?: boolean;
    modelProvider: string;
    name?: string;
    refreshToken?: string;
  }): Promise<void> {
    setCredentialErrorMessage(null);
    await new Promise<void>((resolve, reject) => {
      commitAddModelProviderCredential({
        variables: {
          input: {
            ...input,
            modelProvider: input.modelProvider,
          },
        },
        onCompleted: async (response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage.length > 0) {
            reject(new Error(nextErrorMessage));
            return;
          }

          if (!response.AddModelProviderCredential?.id) {
            reject(new Error("Provider setup did not create a credential."));
            return;
          }

          try {
            await updateOnboarding({
              llmSetupStatus: "third_party",
            });
            setIsCredentialDialogOpen(false);
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        onError: reject,
      });
    }).catch((error) => {
      setCredentialErrorMessage(
        error instanceof Error ? error.message : "Failed to create provider credentials.",
      );
      throw error;
    });
  }

  function openGithubInstall(returnPath: string) {
    setErrorMessage(null);
    commitCreateGithubInstallationUrl({
      variables: {
        returnPath,
      },
      onCompleted: (response, errors) => {
        const nextErrorMessage = String(errors?.[0]?.message || "").trim();
        if (nextErrorMessage.length > 0) {
          setErrorMessage(nextErrorMessage);
          return;
        }

        const installationUrl = String(response.CreateGithubInstallationUrl?.url || "").trim();
        if (!installationUrl) {
          setErrorMessage("GitHub setup did not return an installation URL.");
          return;
        }

        window.location.href = installationUrl;
      },
      onError: (error) => {
        setErrorMessage(error.message || "Failed to prepare GitHub setup.");
      },
    });
  }

  return {
    credentialErrorMessage,
    errorMessage,
    githubResolved,
    hasGithubInstallation,
    hasManagedCredential,
    hasThirdPartyCredential,
    isAddModelProviderCredentialInFlight,
    isCreateGithubInstallationUrlInFlight,
    isCredentialDialogOpen,
    isEnsureCompanyOnboardingInFlight,
    isUpdateCompanyOnboardingInFlight,
    llmResolved,
    missionDraft,
    missionResolved,
    needsOnboardingStart,
    onboarding,
    setupResolved,
    thirdPartyProviders,
    clearErrorMessage: () => {
      setErrorMessage(null);
    },
    createCredential,
    openGithubInstall,
    setCredentialDialogOpen: (open) => {
      setCredentialErrorMessage(null);
      setIsCredentialDialogOpen(open);
    },
    setMissionDraft,
    updateOnboarding,
  };
}

export function resolveCurrentStep(input: {
  githubResolved: boolean;
  llmResolved: boolean;
  missionResolved: boolean;
}): OnboardingStepKey {
  if (!input.missionResolved) {
    return "mission";
  }
  if (!input.githubResolved) {
    return "github";
  }

  return "model-provider";
}

export function onboardingPath(step: OnboardingStepKey): string {
  switch (step) {
    case "mission":
      return "/onboarding/mission";
    case "github":
      return "/onboarding/github";
    case "model-provider":
      return "/onboarding/model-provider";
  }
}

export function navigateToOnboardingStep(input: {
  navigate: ReturnType<typeof useNavigate>;
  organizationSlug: string;
  replace?: boolean;
  step: OnboardingStepKey;
}) {
  void input.navigate({
    params: {
      organizationSlug: input.organizationSlug,
    },
    replace: input.replace,
    to: OrganizationPath.route(onboardingPath(input.step)),
  });
}

export function OnboardingStepFrame(props: {
  children: ReactNode;
  currentStep: OnboardingStepKey;
  description: string;
  errorMessage?: string | null;
  helperText: string;
  title: string;
}) {
  const stepNumber = props.currentStep === "mission" ? 1 : (props.currentStep === "github" ? 2 : 3);
  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-center px-4 py-6">
      <section className="rounded-2xl border border-border/70 bg-card/85 p-6 shadow-sm">
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Company setup · Step {stepNumber} of 3
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{props.title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{props.description}</p>
        </div>
        {props.errorMessage ? (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {props.errorMessage}
          </div>
        ) : null}
        <div className="mt-6">{props.children}</div>
        <p className="mt-5 text-sm leading-6 text-muted-foreground">{props.helperText}</p>
      </section>
    </div>
  );
}

export function OnboardingNavigation(props: {
  backStep?: OnboardingStepKey;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {props.backStep ? (
        <Button
          onClick={() => {
            navigateToOnboardingStep({
              navigate,
              organizationSlug,
              step: props.backStep!,
            });
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          Back
        </Button>
      ) : null}
      {props.children}
    </div>
  );
}

export function OnboardingModelProviderDialog(props: {
  controller: OnboardingFlowController;
  onCompleted(): void;
}) {
  return (
    <CreateCredentialDialog
      errorMessage={props.controller.credentialErrorMessage}
      isOpen={props.controller.isCredentialDialogOpen}
      isSaving={props.controller.isAddModelProviderCredentialInFlight}
      onCreate={async (input) => {
        await props.controller.createCredential(input);
        props.onCompleted();
      }}
      onOpenChange={(open) => {
        props.controller.setCredentialDialogOpen(open);
      }}
      providers={props.controller.thirdPartyProviders}
      suggestDefault={!props.controller.hasThirdPartyCredential}
    />
  );
}

export function OnboardingPageLoadingState(props: {
  message: string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4">
      <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <Loader2Icon className="size-4 animate-spin" />
        <span>{props.message}</span>
      </div>
    </div>
  );
}

export function OnboardingPageMessageState(props: {
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

export function OnboardingCompleteState() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();

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

export function OnboardingSkippedState() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();

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
