import { Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { GaugeIcon, RefreshCcwIcon, StarIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { ModelProviderIcon } from "@/components/model_provider_icon";
import { UsageSummaryPanel } from "@/components/usage/usage_summary_panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page_tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrganizationPath } from "@/lib/organization_path";
import { UsageMetrics } from "@/lib/usage_metrics";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import type { credentialDetailPageQuery } from "./__generated__/credentialDetailPageQuery.graphql";
import type { credentialDetailPageRefreshCredentialTokenMutation } from "./__generated__/credentialDetailPageRefreshCredentialTokenMutation.graphql";
import type { credentialDetailPageRefreshModelsMutation } from "./__generated__/credentialDetailPageRefreshModelsMutation.graphql";
import type { credentialDetailPageSetDefaultModelMutation } from "./__generated__/credentialDetailPageSetDefaultModelMutation.graphql";
import type { credentialDetailPageUpdateCompanySettingsMutation } from "./__generated__/credentialDetailPageUpdateCompanySettingsMutation.graphql";
import {
  getCredentialRefreshFailureReason,
  getCredentialRefreshFailureRecoveryMessage,
  hasCredentialRefreshFailure,
} from "./credential_health";
import { isManagedModelProviderCredentialId } from "./managed_credential";
import { formatProviderCredentialType, formatProviderLabel } from "./provider_label";

const modelProviderCredentialDetailPageQueryNode = graphql`
  query credentialDetailPageQuery($credentialId: ID!, $isManagedCredential: Boolean!, $dailyStart: String!, $monthlyStart: String!) {
    CompanySettings @include(if: $isManagedCredential) {
      companyId
      defaultManagedPlatformModelId
    }
    AgentCreateOptions @include(if: $isManagedCredential) {
      id
      modelCredentialSource
      label
      modelProvider
      defaultModelId
      models {
        id
        modelCredentialSource
        platformModelId
        modelId
        name
        description
        reasoningSupported
        reasoningLevels
      }
    }
    ModelProviderCredentials @skip(if: $isManagedCredential) {
      id
      baseUrl
      name
      modelProvider
      type
      status
      errorMessage
      refreshedAt
      updatedAt
    }
    CodexRateLimits(modelProviderCredentialId: $credentialId) @skip(if: $isManagedCredential) {
      isCodexCredential
      modelProviderCredentialId
      snapshots {
        credits {
          balance
          hasCredits
          unlimited
        }
        lastError
        limitId
        limitName
        planType
        primary {
          resetsAt
          usedPercent
          windowMinutes
        }
        rateLimitReachedType
        refreshedAt
        secondary {
          resetsAt
          usedPercent
          windowMinutes
        }
      }
    }
    ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) @skip(if: $isManagedCredential) {
      id
      isDefault
      name
      description
      reasoningSupported
      reasoningLevels
    }
    providerTotal: LlmUsageAggregates(input: { scopeType: model_provider_credential, modelProviderCredentialId: $credentialId, period: total }) @skip(if: $isManagedCredential) {
      cacheReadCostNanoUsd
      cacheReadCostNanoVirtualUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteCostNanoVirtualUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputCostNanoVirtualUsd
      inputTokens
      outputCostNanoUsd
      outputCostNanoVirtualUsd
      outputTokens
      period
      periodStart
      requestCount
      companyId
      agentId
      modelProviderCredentialId
      sessionId
      scopeType
      totalCostNanoUsd
      totalCostNanoVirtualUsd
      totalTokens
    }
    providerDaily: LlmUsageAggregates(input: { scopeType: model_provider_credential, modelProviderCredentialId: $credentialId, period: day, periodStartAfter: $dailyStart }) @skip(if: $isManagedCredential) {
      cacheReadCostNanoUsd
      cacheReadCostNanoVirtualUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteCostNanoVirtualUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputCostNanoVirtualUsd
      inputTokens
      outputCostNanoUsd
      outputCostNanoVirtualUsd
      outputTokens
      period
      periodStart
      requestCount
      companyId
      agentId
      modelProviderCredentialId
      sessionId
      scopeType
      totalCostNanoUsd
      totalCostNanoVirtualUsd
      totalTokens
    }
    providerMonthly: LlmUsageAggregates(input: { scopeType: model_provider_credential, modelProviderCredentialId: $credentialId, period: month, periodStartAfter: $monthlyStart }) @skip(if: $isManagedCredential) {
      cacheReadCostNanoUsd
      cacheReadCostNanoVirtualUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteCostNanoVirtualUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputCostNanoVirtualUsd
      inputTokens
      outputCostNanoUsd
      outputCostNanoVirtualUsd
      outputTokens
      period
      periodStart
      requestCount
      companyId
      agentId
      modelProviderCredentialId
      sessionId
      scopeType
      totalCostNanoUsd
      totalCostNanoVirtualUsd
      totalTokens
    }
    managedTotal: LlmUsageAggregates(input: { scopeType: managed_model_provider_credential, period: total }) @include(if: $isManagedCredential) {
      cacheReadCostNanoUsd
      cacheReadCostNanoVirtualUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteCostNanoVirtualUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputCostNanoVirtualUsd
      inputTokens
      outputCostNanoUsd
      outputCostNanoVirtualUsd
      outputTokens
      period
      periodStart
      requestCount
      companyId
      agentId
      modelProviderCredentialId
      sessionId
      scopeType
      totalCostNanoUsd
      totalCostNanoVirtualUsd
      totalTokens
    }
    managedDaily: LlmUsageAggregates(input: { scopeType: managed_model_provider_credential, period: day, periodStartAfter: $dailyStart }) @include(if: $isManagedCredential) {
      cacheReadCostNanoUsd
      cacheReadCostNanoVirtualUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteCostNanoVirtualUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputCostNanoVirtualUsd
      inputTokens
      outputCostNanoUsd
      outputCostNanoVirtualUsd
      outputTokens
      period
      periodStart
      requestCount
      companyId
      agentId
      modelProviderCredentialId
      sessionId
      scopeType
      totalCostNanoUsd
      totalCostNanoVirtualUsd
      totalTokens
    }
    managedMonthly: LlmUsageAggregates(input: { scopeType: managed_model_provider_credential, period: month, periodStartAfter: $monthlyStart }) @include(if: $isManagedCredential) {
      cacheReadCostNanoUsd
      cacheReadCostNanoVirtualUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteCostNanoVirtualUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputCostNanoVirtualUsd
      inputTokens
      outputCostNanoUsd
      outputCostNanoVirtualUsd
      outputTokens
      period
      periodStart
      requestCount
      companyId
      agentId
      modelProviderCredentialId
      sessionId
      scopeType
      totalCostNanoUsd
      totalCostNanoVirtualUsd
      totalTokens
    }
  }
`;

const credentialDetailPageUpdateCompanySettingsMutationNode = graphql`
  mutation credentialDetailPageUpdateCompanySettingsMutation(
    $input: UpdateCompanySettingsInput!
  ) {
    UpdateCompanySettings(input: $input) {
      companyId
      baseSystemPrompt
      defaultManagedPlatformModelId
    }
  }
`;

const modelProviderCredentialDetailPageSetDefaultModelMutationNode = graphql`
  mutation credentialDetailPageSetDefaultModelMutation(
    $input: SetDefaultModelProviderCredentialModelInput!
  ) {
    SetDefaultModelProviderCredentialModel(input: $input) {
      id
      isDefault
    }
  }
`;

const modelProviderCredentialDetailPageRefreshCredentialTokenMutationNode = graphql`
  mutation credentialDetailPageRefreshCredentialTokenMutation(
    $input: RefreshModelProviderCredentialTokenInput!
  ) {
    RefreshModelProviderCredentialToken(input: $input) {
      id
      status
      errorMessage
      refreshToken
      refreshedAt
      updatedAt
    }
  }
`;

const modelProviderCredentialDetailPageRefreshModelsMutationNode = graphql`
  mutation credentialDetailPageRefreshModelsMutation(
    $input: RefreshModelProviderCredentialModelsInput!
  ) {
    RefreshModelProviderCredentialModels(input: $input) {
      id
      modelProviderCredentialId
      modelId
      name
      description
      reasoningSupported
      reasoningLevels
    }
  }
`;

function ModelProviderCredentialDetailPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Models available for this credential.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading models…
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function formatTimestamp(value: string | null | undefined): string {
  const timestamp = new Date(String(value || ""));
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Unknown";
  }

  return `${Math.round(value)}%`;
}

function formatWindow(value: {
  readonly resetsAt: string | null | undefined;
  readonly windowMinutes: number | null | undefined;
}): string {
  const windowLabel = typeof value.windowMinutes === "number"
    ? `${value.windowMinutes} min`
    : "Unknown window";
  return `${windowLabel} · resets ${formatTimestamp(value.resetsAt)}`;
}

function formatReasoning(model: {
  reasoningSupported: boolean;
  reasoningLevels: ReadonlyArray<string>;
}): string {
  if (model.reasoningLevels.length > 0) {
    return model.reasoningLevels.join(", ");
  }

  if (!model.reasoningSupported) {
    return "—";
  }

  return "Supported";
}

type CredentialDetailModelRecord = {
  description: string;
  id: string;
  isDefault: boolean;
  modelProviderCredentialModelId: string | null;
  name: string;
  platformModelId: string | null;
  reasoningSupported: boolean;
  reasoningLevels: ReadonlyArray<string>;
};

function CodexLimitUsageBar({ value }: { value: number | null | undefined }) {
  const normalizedValue = typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, value))
    : 0;

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-foreground"
        style={{ width: `${normalizedValue}%` }}
      />
    </div>
  );
}

function CodexLimitPanel({
  snapshots,
}: {
  snapshots: NonNullable<credentialDetailPageQuery["response"]["CodexRateLimits"]>["snapshots"];
}) {
  if (snapshots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No Codex limit snapshot yet</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          The first snapshot is saved after the next completed assistant response.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {snapshots.map((snapshot) => (
        <div key={snapshot.limitId} className="rounded-xl border border-border/70 bg-background p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <GaugeIcon className="size-4 text-muted-foreground" />
                <p className="truncate text-sm font-medium text-foreground">
                  {snapshot.limitName || snapshot.limitId}
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Refreshed {formatTimestamp(snapshot.refreshedAt)}
              </p>
            </div>
            {snapshot.planType ? (
              <Badge variant="secondary">{snapshot.planType}</Badge>
            ) : null}
          </div>

          {snapshot.lastError ? (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {snapshot.lastError}
            </div>
          ) : null}

          <div className="mt-4 grid gap-4">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-foreground">Primary</span>
                <span className="text-muted-foreground">{formatPercent(snapshot.primary.usedPercent)}</span>
              </div>
              <CodexLimitUsageBar value={snapshot.primary.usedPercent} />
              <p className="text-xs text-muted-foreground">{formatWindow(snapshot.primary)}</p>
            </div>

            {snapshot.secondary.usedPercent !== null || snapshot.secondary.windowMinutes !== null ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">Secondary</span>
                  <span className="text-muted-foreground">{formatPercent(snapshot.secondary.usedPercent)}</span>
                </div>
                <CodexLimitUsageBar value={snapshot.secondary.usedPercent} />
                <p className="text-xs text-muted-foreground">{formatWindow(snapshot.secondary)}</p>
              </div>
            ) : null}

            {snapshot.credits.hasCredits !== null || snapshot.credits.balance || snapshot.credits.unlimited !== null ? (
              <div className="flex flex-wrap gap-2">
                {snapshot.credits.hasCredits !== null ? (
                  <Badge variant="outline">
                    {snapshot.credits.hasCredits ? "Credits available" : "No credits"}
                  </Badge>
                ) : null}
                {snapshot.credits.unlimited !== null ? (
                  <Badge variant="outline">
                    {snapshot.credits.unlimited ? "Unlimited" : "Metered"}
                  </Badge>
                ) : null}
                {snapshot.credits.balance ? (
                  <Badge variant="outline">Balance {snapshot.credits.balance}</Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModelProviderCredentialDetailPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const navigate = useNavigate();
  const { credentialId } = useParams({ strict: false }) as { credentialId?: string };
  const search = useSearch({ strict: false }) as { tab?: "limit" | "models" | "usage" };
  const organizationSlug = useCurrentOrganizationSlug();
  const { setDetailLabel } = useApplicationBreadcrumb();
  const normalizedCredentialId = String(credentialId || "").trim();
  if (!normalizedCredentialId) {
    throw new Error("Credential ID is required.");
  }
  const isManagedCredential = isManagedModelProviderCredentialId(normalizedCredentialId);
  const data = useLazyLoadQuery<credentialDetailPageQuery>(
    modelProviderCredentialDetailPageQueryNode,
    {
      credentialId: normalizedCredentialId,
      isManagedCredential,
      dailyStart: UsageMetrics.resolveUtcDayStart(29),
      monthlyStart: UsageMetrics.resolveUtcMonthStart(11),
    },
    {
      fetchPolicy: "store-and-network",
      fetchKey,
    },
  );
  const [commitRefreshModels, isRefreshInFlight] =
    useMutation<credentialDetailPageRefreshModelsMutation>(
      modelProviderCredentialDetailPageRefreshModelsMutationNode,
    );
  const [commitRefreshCredentialToken, isRefreshTokenInFlight] =
    useMutation<credentialDetailPageRefreshCredentialTokenMutation>(
      modelProviderCredentialDetailPageRefreshCredentialTokenMutationNode,
    );
  const [commitSetDefaultModel, isSetDefaultModelInFlight] =
    useMutation<credentialDetailPageSetDefaultModelMutation>(
      modelProviderCredentialDetailPageSetDefaultModelMutationNode,
    );
  const [commitUpdateCompanySettings, isUpdateCompanySettingsInFlight] =
    useMutation<credentialDetailPageUpdateCompanySettingsMutation>(
      credentialDetailPageUpdateCompanySettingsMutationNode,
    );
  const currentCredential = (data.ModelProviderCredentials ?? [])
    .find((credential) => credential.id === normalizedCredentialId);
  const managedProviderOption = (data.AgentCreateOptions ?? [])
    .find((providerOption) =>
      providerOption.modelCredentialSource === "platform" && providerOption.models.length > 0
    );
  const configuredManagedDefaultPlatformModelId = data.CompanySettings?.defaultManagedPlatformModelId ?? null;
  const managedDefaultPlatformModelId = managedProviderOption?.models
    .find((model) => model.platformModelId === configuredManagedDefaultPlatformModelId)?.platformModelId
    ?? managedProviderOption?.models.find((model) => model.modelId === managedProviderOption.defaultModelId)?.platformModelId
    ?? managedProviderOption?.models[0]?.platformModelId
    ?? null;
  const providerLabel = isManagedCredential
    ? (managedProviderOption?.label ?? "CompanyHelm")
    : (formatProviderLabel(String(currentCredential?.modelProvider || "").trim(), {
      baseUrl: currentCredential?.baseUrl ?? null,
    }) || "Credential");
  const isOauthCredential = currentCredential?.type === "oauth_token";
  const isCodexCredential = !isManagedCredential && currentCredential?.modelProvider === "openai-codex";
  const selectedTab = search.tab === "limit" && isCodexCredential
    ? "limit"
    : search.tab === "usage"
      ? "usage"
      : "models";
  const showRefreshFailure = currentCredential ? hasCredentialRefreshFailure(currentCredential) : false;
  const credentialStatus = isOauthCredential
    ? (currentCredential?.refreshedAt
      ? `Token refreshed ${formatTimestamp(currentCredential.refreshedAt)}`
      : "Token has not been refreshed yet.")
    : isManagedCredential
      ? "Managed by CompanyHelm"
      : `Credential updated ${formatTimestamp(currentCredential?.updatedAt)}`;
  const credentialModels = useMemo<CredentialDetailModelRecord[]>(() => {
    if (isManagedCredential) {
      return (managedProviderOption?.models ?? [])
        .filter((model) => model.platformModelId)
        .map((model) => ({
          description: model.description,
          id: String(model.platformModelId),
          isDefault: model.platformModelId === managedDefaultPlatformModelId,
          modelProviderCredentialModelId: null,
          name: model.name,
          platformModelId: model.platformModelId ?? null,
          reasoningSupported: model.reasoningSupported,
          reasoningLevels: model.reasoningLevels,
        }));
    }

    return (data.ModelProviderCredentialModels ?? []).map((model) => ({
      description: model.description,
      id: model.id,
      isDefault: model.isDefault,
      modelProviderCredentialModelId: model.id,
      name: model.name,
      platformModelId: null,
      reasoningSupported: model.reasoningSupported,
      reasoningLevels: model.reasoningLevels,
    }));
  }, [
    data.ModelProviderCredentialModels,
    isManagedCredential,
    managedDefaultPlatformModelId,
    managedProviderOption,
  ]);

  useEffect(() => {
    setDetailLabel(providerLabel);

    return () => {
      setDetailLabel(null);
    };
  }, [providerLabel, setDetailLabel]);
  const providerUsageAggregates = useMemo(() => {
    if (isManagedCredential) {
      return UsageMetrics.fromGraphqlAggregates([
        ...(data.managedTotal ?? []),
        ...(data.managedDaily ?? []),
        ...(data.managedMonthly ?? []),
      ]);
    }

    return UsageMetrics.fromGraphqlAggregates([
      ...(data.providerTotal ?? []),
      ...(data.providerDaily ?? []),
      ...(data.providerMonthly ?? []),
    ]);
  }, [
    data.managedDaily,
    data.managedMonthly,
    data.managedTotal,
    data.providerDaily,
    data.providerMonthly,
    data.providerTotal,
    isManagedCredential,
  ]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageTabs
        items={[
          {
            key: "models" as const,
            label: "Models",
          },
          {
            key: "usage" as const,
            label: "Usage",
          },
          ...(isCodexCredential ? [{
            key: "limit" as const,
            label: "Limit",
          }] : []),
        ]}
        onSelect={(tab) => {
          void navigate({
            params: {
              credentialId: normalizedCredentialId,
              organizationSlug,
            },
            search: {
              tab,
            },
            to: OrganizationPath.route("/model-provider-credentials/$credentialId"),
          });
        }}
        selectedKey={selectedTab}
      />

      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5" variant="outline">
              <ModelProviderIcon
                className="-ml-1 size-4 rounded-sm bg-transparent"
                imageClassName="size-3"
                label={providerLabel}
                providerId={isManagedCredential ? "companyhelm" : String(currentCredential?.modelProvider || "").trim()}
              />
              <span>{providerLabel}</span>
            </Badge>
            <Badge variant="secondary">
              {isManagedCredential ? "Managed" : formatProviderCredentialType(String(currentCredential?.type || "api_key"))}
            </Badge>
            <span className="text-xs text-muted-foreground">{credentialStatus}</span>
          </CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
              {isManagedCredential ? (
                <Badge variant="secondary">Read only</Badge>
              ) : isOauthCredential ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRefreshTokenInFlight}
                  onClick={async () => {
                    if (isRefreshTokenInFlight) {
                      return;
                    }

                    setErrorMessage(null);
                    await new Promise<void>((resolve, reject) => {
                      commitRefreshCredentialToken({
                        variables: {
                          input: {
                            modelProviderCredentialId: normalizedCredentialId,
                          },
                        },
                        onCompleted: (_response, errors) => {
                          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                          if (nextErrorMessage) {
                            reject(new Error(nextErrorMessage));
                            return;
                          }

                          setFetchKey((current) => current + 1);
                          resolve();
                        },
                        onError: reject,
                      });
                    }).catch((error: unknown) => {
                      setErrorMessage(error instanceof Error ? error.message : "Failed to refresh credential token.");
                    });
                  }}
                >
                  <RefreshCcwIcon className={isRefreshTokenInFlight ? "animate-spin" : ""} />
                  Refresh token
                </Button>
              ) : null}
              {!isManagedCredential ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRefreshInFlight}
                  onClick={async () => {
                    if (isRefreshInFlight) {
                      return;
                    }

                    setErrorMessage(null);
                    await new Promise<void>((resolve, reject) => {
                      commitRefreshModels({
                        variables: {
                          input: {
                            modelProviderCredentialId: normalizedCredentialId,
                          },
                        },
                        onCompleted: (_response, errors) => {
                          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                          if (nextErrorMessage) {
                            reject(new Error(nextErrorMessage));
                            return;
                          }

                          setFetchKey((current) => current + 1);
                          resolve();
                        },
                        onError: reject,
                      });
                    }).catch((error: unknown) => {
                      setErrorMessage(error instanceof Error ? error.message : "Failed to refresh models.");
                    });
                  }}
                >
                  <RefreshCcwIcon className={isRefreshInFlight ? "animate-spin" : ""} />
                  Refresh models
                </Button>
              ) : null}
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {showRefreshFailure ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-xs text-destructive">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Reconnect required</Badge>
                <span className="font-medium">
                  Automatic refresh failed for {currentCredential?.name || providerLabel}.
                </span>
              </div>
              <p className="mt-2">{getCredentialRefreshFailureRecoveryMessage()}</p>
              <p className="mt-2 text-destructive/90">
                Last error: {getCredentialRefreshFailureReason(currentCredential?.errorMessage)}
              </p>
            </div>
          ) : null}
          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
          {selectedTab === "limit" ? (
            <CodexLimitPanel snapshots={data.CodexRateLimits?.snapshots ?? []} />
          ) : selectedTab === "usage" ? (
            <div className="grid gap-6">
              <UsageSummaryPanel
                aggregates={providerUsageAggregates}
                description={isManagedCredential
                  ? "CompanyHelm-managed model usage for this company, including day and month trends from the live usage aggregate table."
                  : "Provider-specific rollup for this credential, including day and month trends from the live usage aggregate table."}
                scopeId={isManagedCredential ? (data.CompanySettings?.companyId ?? "") : normalizedCredentialId}
                scopeType={isManagedCredential ? "managed_model_provider_credential" : "model_provider_credential"}
                spendKind={isManagedCredential || isOauthCredential ? "virtual" : "actual"}
                title={isManagedCredential
                  ? "CompanyHelm managed usage"
                  : `${currentCredential?.name ?? providerLabel} usage`}
              />
            </div>
          ) : credentialModels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No models returned</p>
              <p className="mt-2 text-xs/relaxed text-muted-foreground">
                This credential did not return any models from the provider.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reasoning</TableHead>
                  <TableHead className="w-24 text-right">Default</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentialModels.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{model.name}</span>
                        {model.isDefault ? (
                          <Badge variant="secondary">Default</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{model.description}</TableCell>
                    <TableCell>{formatReasoning(model)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        disabled={model.isDefault || isSetDefaultModelInFlight || isUpdateCompanySettingsInFlight}
                        onClick={async () => {
                          if (model.isDefault || isSetDefaultModelInFlight || isUpdateCompanySettingsInFlight) {
                            return;
                          }

                          setErrorMessage(null);
                          if (isManagedCredential) {
                            await new Promise<void>((resolve, reject) => {
                              commitUpdateCompanySettings({
                                variables: {
                                  input: {
                                    defaultManagedPlatformModelId: model.platformModelId,
                                  },
                                },
                                onCompleted: (_response, errors) => {
                                  const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                                  if (nextErrorMessage) {
                                    reject(new Error(nextErrorMessage));
                                    return;
                                  }

                                  setFetchKey((current) => current + 1);
                                  resolve();
                                },
                                onError: reject,
                              });
                            }).catch((error: unknown) => {
                              setErrorMessage(error instanceof Error ? error.message : "Failed to update default model.");
                            });
                            return;
                          }

                          await new Promise<void>((resolve, reject) => {
                            commitSetDefaultModel({
                              variables: {
                                input: {
                                  id: model.id,
                                },
                              },
                              updater: (store) => {
                                const updatedModel = store.getRootField("SetDefaultModelProviderCredentialModel");
                                if (!updatedModel) {
                                  return;
                                }

                                const updatedId = updatedModel.getDataID();
                                const rootRecord = store.getRoot();
                                const currentModels = (rootRecord.getLinkedRecords("ModelProviderCredentialModels") || [])
                                  .filter((record): record is { getDataID(): string; setValue(value: unknown, fieldName: string): void } => {
                                    return typeof record === "object"
                                      && record !== null
                                      && "getDataID" in record
                                      && typeof record.getDataID === "function"
                                      && "setValue" in record
                                      && typeof record.setValue === "function";
                                  });
                                currentModels.forEach((record) => {
                                  record.setValue(record.getDataID() === updatedId, "isDefault");
                                });
                              },
                              onCompleted: (_response, errors) => {
                                const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                                if (nextErrorMessage) {
                                  reject(new Error(nextErrorMessage));
                                  return;
                                }

                                setFetchKey((current) => current + 1);
                                resolve();
                              },
                              onError: reject,
                            });
                          }).catch((error: unknown) => {
                            setErrorMessage(error instanceof Error ? error.message : "Failed to update default model.");
                          });
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <StarIcon className={`size-4 ${model.isDefault ? "fill-current" : ""}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export function ModelProviderCredentialDetailPage() {
  return (
    <Suspense fallback={<ModelProviderCredentialDetailPageFallback />}>
      <ModelProviderCredentialDetailPageContent />
    </Suspense>
  );
}
