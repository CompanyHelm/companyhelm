import { useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeftIcon, GaugeIcon, RefreshCcwIcon, StarIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page_tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatProviderLabel } from "@/pages/model-provider-credentials/provider_label";
import type { llmCredentialDetailPageQuery } from "./__generated__/llmCredentialDetailPageQuery.graphql";
import type { llmCredentialDetailPageRefreshLimitMutation } from "./__generated__/llmCredentialDetailPageRefreshLimitMutation.graphql";
import type { llmCredentialDetailPageRefreshMutation } from "./__generated__/llmCredentialDetailPageRefreshMutation.graphql";
import type { llmCredentialDetailPageSetDefaultMutation } from "./__generated__/llmCredentialDetailPageSetDefaultMutation.graphql";

const llmCredentialDetailPageQueryNode = graphql`
  query llmCredentialDetailPageQuery($credentialId: ID!) {
    PlatformModelProviderCredentials {
      id
      baseUrl
      name
      modelProvider
      defaultModelId
    }
    PlatformModelProviderCredentialModels(platformModelProviderCredentialId: $credentialId) {
      id
      isDefault
      platformModelProviderCredentialId
      modelId
      name
      description
      reasoningSupported
      reasoningLevels
      updatedAt
    }
    PlatformCodexRateLimits(platformModelProviderCredentialId: $credentialId) {
      isCodexCredential
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
  }
`;

const llmCredentialDetailPageRefreshMutationNode = graphql`
  mutation llmCredentialDetailPageRefreshMutation($input: RefreshPlatformModelProviderCredentialModelsInput!) {
    RefreshPlatformModelProviderCredentialModels(input: $input) {
      id
      isDefault
      modelId
      name
      description
      reasoningSupported
      reasoningLevels
      updatedAt
    }
  }
`;

const llmCredentialDetailPageRefreshLimitMutationNode = graphql`
  mutation llmCredentialDetailPageRefreshLimitMutation($input: RefreshPlatformCodexRateLimitsInput!) {
    RefreshPlatformCodexRateLimits(input: $input) {
      isCodexCredential
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
  }
`;

const llmCredentialDetailPageSetDefaultMutationNode = graphql`
  mutation llmCredentialDetailPageSetDefaultMutation($input: SetDefaultPlatformModelProviderCredentialModelInput!) {
    SetDefaultPlatformModelProviderCredentialModel(input: $input) {
      id
      isDefault
    }
  }
`;

type PlatformModel = llmCredentialDetailPageQuery["response"]["PlatformModelProviderCredentialModels"][number];

/**
 * Shows the model catalog discovered for one platform credential and lets platform admins refresh
 * provider models or select the credential-local default model.
 */
export function AdminLlmCredentialDetailPage() {
  return (
    <PlatformAdminGuard>
      <AdminLlmCredentialDetailPageContent />
    </PlatformAdminGuard>
  );
}

function AdminLlmCredentialDetailPageContent() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { platformCredentialId?: string };
  const search = useSearch({ strict: false }) as { tab?: "limit" | "models" };
  const credentialId = params.platformCredentialId ?? "";
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const data = useLazyLoadQuery<llmCredentialDetailPageQuery>(
    llmCredentialDetailPageQueryNode,
    {
      credentialId,
    },
    {
      fetchKey,
      fetchPolicy: "store-and-network",
    },
  );
  const [commitRefreshModels, isRefreshModelsInFlight] =
    useMutation<llmCredentialDetailPageRefreshMutation>(llmCredentialDetailPageRefreshMutationNode);
  const [commitRefreshLimit, isRefreshLimitInFlight] =
    useMutation<llmCredentialDetailPageRefreshLimitMutation>(llmCredentialDetailPageRefreshLimitMutationNode);
  const [commitSetDefault, isSetDefaultInFlight] =
    useMutation<llmCredentialDetailPageSetDefaultMutation>(llmCredentialDetailPageSetDefaultMutationNode);
  const credential = data.PlatformModelProviderCredentials.find((item) => item.id === credentialId) ?? null;
  const isCodexCredential = data.PlatformCodexRateLimits.isCodexCredential;
  const selectedTab = search.tab === "limit" && isCodexCredential ? "limit" : "models";
  const refreshPage = () => {
    setFetchKey((current) => current + 1);
  };

  const runMutation = async (operation: (resolve: () => void, reject: (error: Error) => void) => void) => {
    await new Promise<void>((resolve, reject) => {
      operation(resolve, reject);
    });
    refreshPage();
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <PageTabs
        items={[
          {
            key: "models" as const,
            label: "Models",
          },
          ...(isCodexCredential ? [{
            key: "limit" as const,
            label: "Limit",
          }] : []),
        ]}
        onSelect={(tab) => {
          void navigate({
            search: {
              tab,
            },
            to: `/admin/llm-credentials/${credentialId}`,
          });
        }}
        selectedKey={selectedTab}
      />

      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <Button asChild className="mb-4" size="sm" variant="ghost">
              <Link to="/admin/llm-credentials">
                <ArrowLeftIcon />
                Back
              </Link>
            </Button>
            <CardTitle>{credential?.name ?? "Platform credential"}</CardTitle>
            <CardDescription>
              {credential
                ? `${formatProviderLabel(credential.modelProvider, {
                  baseUrl: credential.baseUrl ?? null,
                })} platform credential`
                : "Settings for this platform credential."}
            </CardDescription>
          </div>
          <CardAction>
            {selectedTab === "models" ? (
              <Button
                disabled={isRefreshModelsInFlight}
                onClick={async () => {
                  setErrorMessage(null);
                  await runMutation((resolve, reject) => {
                    commitRefreshModels({
                      variables: {
                        input: {
                          platformModelProviderCredentialId: credentialId,
                        },
                      },
                      onCompleted: (_response, errors) => {
                        const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                        if (nextErrorMessage) {
                          reject(new Error(nextErrorMessage));
                          return;
                        }

                        resolve();
                      },
                      onError: reject,
                    });
                  }).catch((error: unknown) => {
                    setErrorMessage(error instanceof Error ? error.message : "Failed to refresh models.");
                  });
                }}
                size="sm"
              >
                <RefreshCcwIcon className={isRefreshModelsInFlight ? "animate-spin" : ""} />
                Refresh models
              </Button>
            ) : selectedTab === "limit" ? (
              <Button
                disabled={isRefreshLimitInFlight}
                onClick={async () => {
                  setErrorMessage(null);
                  await runMutation((resolve, reject) => {
                    commitRefreshLimit({
                      variables: {
                        input: {
                          platformModelProviderCredentialId: credentialId,
                        },
                      },
                      onCompleted: (_response, errors) => {
                        const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                        if (nextErrorMessage) {
                          reject(new Error(nextErrorMessage));
                          return;
                        }

                        resolve();
                      },
                      onError: reject,
                    });
                  }).catch((error: unknown) => {
                    setErrorMessage(error instanceof Error ? error.message : "Failed to refresh limit.");
                  });
                }}
                size="sm"
                variant="outline"
              >
                <RefreshCcwIcon className={isRefreshLimitInFlight ? "animate-spin" : ""} />
                Refresh limit
              </Button>
            ) : null}
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
          {selectedTab === "limit" ? (
            <CodexLimitPanel snapshots={data.PlatformCodexRateLimits.snapshots} />
          ) : (
            <PlatformModelsTable
              isSetDefaultInFlight={isSetDefaultInFlight}
              models={data.PlatformModelProviderCredentialModels}
              onSetDefault={async (modelId) => {
                setErrorMessage(null);
                await runMutation((resolve, reject) => {
                  commitSetDefault({
                    variables: {
                      input: {
                        id: modelId,
                      },
                    },
                    onCompleted: (_response, errors) => {
                      const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                      if (nextErrorMessage) {
                        reject(new Error(nextErrorMessage));
                        return;
                      }

                      resolve();
                    },
                    onError: reject,
                  });
                }).catch((error: unknown) => {
                  setErrorMessage(error instanceof Error ? error.message : "Failed to update default model.");
                });
              }}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Unknown";
  }

  return `${Math.round(value)}%`;
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

function formatWindow(value: {
  readonly resetsAt: string | null | undefined;
  readonly windowMinutes: number | null | undefined;
}, fallbackWindowLabel: string): string {
  const windowLabel = typeof value.windowMinutes === "number"
    ? formatWindowMinutes(value.windowMinutes)
    : fallbackWindowLabel;
  return `${windowLabel} · resets ${formatTimestamp(value.resetsAt)}`;
}

function formatWindowMinutes(value: number): string {
  if (value === 300) {
    return "5h window";
  }
  if (value === 10_080) {
    return "Weekly window";
  }
  if (value % 60 === 0) {
    return `${value / 60}h window`;
  }

  return `${value} min window`;
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

function CodexLimitPanel(props: {
  snapshots: llmCredentialDetailPageQuery["response"]["PlatformCodexRateLimits"]["snapshots"];
}) {
  if (props.snapshots.length === 0) {
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
      {props.snapshots.map((snapshot) => (
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
                <span className="font-medium text-foreground">Primary (5h)</span>
                <span className="text-muted-foreground">{formatPercent(snapshot.primary.usedPercent)}</span>
              </div>
              <CodexLimitUsageBar value={snapshot.primary.usedPercent} />
              <p className="text-xs text-muted-foreground">{formatWindow(snapshot.primary, "5h window")}</p>
            </div>

            {snapshot.secondary.usedPercent !== null
              || snapshot.secondary.windowMinutes !== null
              || snapshot.secondary.resetsAt !== null ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">Secondary (weekly)</span>
                  <span className="text-muted-foreground">{formatPercent(snapshot.secondary.usedPercent)}</span>
                </div>
                <CodexLimitUsageBar value={snapshot.secondary.usedPercent} />
                <p className="text-xs text-muted-foreground">{formatWindow(snapshot.secondary, "Weekly window")}</p>
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

function PlatformModelsTable(props: {
  isSetDefaultInFlight: boolean;
  models: readonly PlatformModel[];
  onSetDefault(modelId: string): Promise<void>;
}) {
  if (props.models.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No models stored</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Refresh the provider catalog to store available models for this credential.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Model</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Reasoning</TableHead>
          <TableHead className="w-24 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.models.map((model) => (
          <TableRow key={model.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{model.name}</span>
                {model.isDefault ? <Badge variant="secondary">Default</Badge> : null}
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{model.modelId}</div>
            </TableCell>
            <TableCell className="max-w-xl text-sm text-muted-foreground">{model.description}</TableCell>
            <TableCell>
              {model.reasoningSupported ? (
                <Badge variant="outline">{model.reasoningLevels.join(", ") || "Supported"}</Badge>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button
                aria-label="Set default model"
                disabled={model.isDefault || props.isSetDefaultInFlight}
                onClick={async () => {
                  await props.onSetDefault(model.id);
                }}
                size="icon"
                variant="ghost"
              >
                <StarIcon className={model.isDefault ? "fill-current" : ""} />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
