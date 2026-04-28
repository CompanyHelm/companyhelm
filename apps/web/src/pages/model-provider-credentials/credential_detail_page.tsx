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
import {
  getCredentialRefreshFailureReason,
  getCredentialRefreshFailureRecoveryMessage,
  hasCredentialRefreshFailure,
} from "./credential_health";
import { formatProviderCredentialType, formatProviderLabel } from "./provider_label";

const modelProviderCredentialDetailPageQueryNode = graphql`
  query credentialDetailPageQuery($credentialId: ID!, $dailyStart: String!, $monthlyStart: String!) {
    ModelProviderCredentials {
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
    CodexRateLimits(modelProviderCredentialId: $credentialId) {
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
    ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) {
      id
      isDefault
      name
      description
      reasoningSupported
      reasoningLevels
    }
    providerTotal: LlmUsageAggregates(input: { scopeType: provider, scopeId: $credentialId, period: total }) {
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
      scopeId
      scopeType
      totalCostNanoUsd
      totalCostNanoVirtualUsd
      totalTokens
    }
    providerDaily: LlmUsageAggregates(input: { scopeType: provider, scopeId: $credentialId, period: day, periodStartAfter: $dailyStart }) {
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
      scopeId
      scopeType
      totalCostNanoUsd
      totalCostNanoVirtualUsd
      totalTokens
    }
    providerMonthly: LlmUsageAggregates(input: { scopeType: provider, scopeId: $credentialId, period: month, periodStartAfter: $monthlyStart }) {
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
      scopeId
      scopeType
      totalCostNanoUsd
      totalCostNanoVirtualUsd
      totalTokens
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
  snapshots: credentialDetailPageQuery["response"]["CodexRateLimits"]["snapshots"];
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
  const data = useLazyLoadQuery<credentialDetailPageQuery>(
    modelProviderCredentialDetailPageQueryNode,
    {
      credentialId: normalizedCredentialId,
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
  const currentCredential = data.ModelProviderCredentials.find((credential) => credential.id === normalizedCredentialId);
  const providerLabel = formatProviderLabel(String(currentCredential?.modelProvider || "").trim(), {
    baseUrl: currentCredential?.baseUrl ?? null,
  })
    || "Credential";
  const isOauthCredential = currentCredential?.type === "oauth_token";
  const isCodexCredential = currentCredential?.modelProvider === "openai-codex";
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
    : `Credential updated ${formatTimestamp(currentCredential?.updatedAt)}`;

  useEffect(() => {
    setDetailLabel(providerLabel);

    return () => {
      setDetailLabel(null);
    };
  }, [providerLabel, setDetailLabel]);
  const providerUsageAggregates = useMemo(() => {
    return UsageMetrics.fromGraphqlAggregates([
      ...data.providerTotal,
      ...data.providerDaily,
      ...data.providerMonthly,
    ]);
  }, [data.providerDaily, data.providerMonthly, data.providerTotal]);

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
                providerId={String(currentCredential?.modelProvider || "").trim()}
              />
              <span>{providerLabel}</span>
            </Badge>
            <Badge variant="secondary">
              {formatProviderCredentialType(String(currentCredential?.type || "api_key"))}
            </Badge>
            <span className="text-xs text-muted-foreground">{credentialStatus}</span>
          </CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
              {isOauthCredential ? (
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
            <CodexLimitPanel snapshots={data.CodexRateLimits.snapshots} />
          ) : selectedTab === "usage" ? (
            <div className="grid gap-6">
              <UsageSummaryPanel
                aggregates={providerUsageAggregates}
                description="Provider-specific rollup for this credential, including day and month trends from the live usage aggregate table."
                scopeId={normalizedCredentialId}
                scopeType="provider"
                spendKind={isOauthCredential ? "virtual" : "actual"}
                title={`${currentCredential?.name ?? providerLabel} usage`}
              />
            </div>
          ) : data.ModelProviderCredentialModels.length === 0 ? (
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
                {data.ModelProviderCredentialModels.map((model) => (
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
                        disabled={model.isDefault || isSetDefaultModelInFlight}
                        onClick={async () => {
                          if (model.isDefault || isSetDefaultModelInFlight) {
                            return;
                          }

                          setErrorMessage(null);
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
