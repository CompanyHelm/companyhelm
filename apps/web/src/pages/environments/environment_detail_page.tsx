import { Suspense, useEffect, useState } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { ErrorState } from "@/components/error_state";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page_tabs";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  environmentActionGetEnvironmentVncUrlMutationNode,
  environmentActionStartEnvironmentMutationNode,
  environmentActionStopEnvironmentMutationNode,
} from "./environment_action_mutations";
import { EnvironmentMetricsTab } from "./environment_metrics_tab";
import { EnvironmentOverviewTab } from "./environment_overview_tab";
import type { environmentDetailPageQuery } from "./__generated__/environmentDetailPageQuery.graphql";
import type { environmentActionMutationsGetEnvironmentVncUrlMutation } from "./__generated__/environmentActionMutationsGetEnvironmentVncUrlMutation.graphql";
import type { environmentActionMutationsStartEnvironmentMutation } from "./__generated__/environmentActionMutationsStartEnvironmentMutation.graphql";
import type { environmentActionMutationsStopEnvironmentMutation } from "./__generated__/environmentActionMutationsStopEnvironmentMutation.graphql";

type EnvironmentDetailPageTab = "metrics" | "overview";

const environmentDetailPageQueryNode = graphql`
  query environmentDetailPageQuery($environmentId: ID!) {
    Environment(id: $environmentId) {
      id
      agentId
      agentName
      provider
      providerDefinitionId
      providerDefinitionName
      providerEnvironmentId
      templateId
      displayName
      platform
      status
      statusErrorMessage
      cpuCount
      memoryGb
      diskSpaceGb
      metricsSampledAt
      cpuUsedPct
      memUsedBytes
      diskUsedBytes
      lastSeenAt
      createdAt
      updatedAt
    }
  }
`;

function EnvironmentDetailPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Loading environment details…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading environment…
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Hosts the environment detail experience with overview and metrics tabs so operators can inspect
 * one reusable environment without scanning the full environments inventory table.
 */
function EnvironmentDetailPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const { environmentId } = useParams({ strict: false }) as { environmentId?: string };
  const search = useSearch({ strict: false }) as { tab?: EnvironmentDetailPageTab };
  const { setDetailLabel } = useApplicationBreadcrumb();
  const [actingEnvironmentId, setActingEnvironmentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const normalizedEnvironmentId = String(environmentId || "").trim();
  const selectedTab: EnvironmentDetailPageTab = search.tab === "metrics" ? "metrics" : "overview";
  const [commitStartEnvironment, isStartEnvironmentInFlight] = useMutation<environmentActionMutationsStartEnvironmentMutation>(
    environmentActionStartEnvironmentMutationNode,
  );
  const [commitGetEnvironmentVncUrl, isGetEnvironmentVncUrlInFlight] = useMutation<environmentActionMutationsGetEnvironmentVncUrlMutation>(
    environmentActionGetEnvironmentVncUrlMutationNode,
  );
  const [commitStopEnvironment, isStopEnvironmentInFlight] = useMutation<environmentActionMutationsStopEnvironmentMutation>(
    environmentActionStopEnvironmentMutationNode,
  );

  if (!normalizedEnvironmentId) {
    return (
      <ErrorState
        actionLabel="Back to environments"
        message="The environment URL is missing an environment ID."
        onAction={() => {
          void navigate({
            params: { organizationSlug },
            to: OrganizationPath.route("/environments"),
          });
        }}
        title="Environment not found"
      />
    );
  }

  const data = useLazyLoadQuery<environmentDetailPageQuery>(
    environmentDetailPageQueryNode,
    {
      environmentId: normalizedEnvironmentId,
    },
    {
      fetchPolicy: "store-or-network",
    },
  );
  const environment = data.Environment;
  const isEnvironmentActionInFlight = isStartEnvironmentInFlight
    || isStopEnvironmentInFlight
    || isGetEnvironmentVncUrlInFlight;
  const environmentOverview = {
    agentName: environment.agentName,
    cpuCount: environment.cpuCount,
    cpuUsedPct: environment.cpuUsedPct ?? null,
    diskSpaceGb: environment.diskSpaceGb,
    diskUsedBytes: environment.diskUsedBytes ?? null,
    displayName: environment.displayName ?? null,
    id: environment.id,
    lastSeenAt: environment.lastSeenAt ?? null,
    memoryGb: environment.memoryGb,
    memUsedBytes: environment.memUsedBytes ?? null,
    metricsSampledAt: environment.metricsSampledAt ?? null,
    platform: environment.platform,
    provider: environment.provider,
    providerDefinitionName: environment.providerDefinitionName ?? null,
    status: environment.status,
    templateId: environment.templateId,
    updatedAt: environment.updatedAt,
  };
  const environmentStatusErrorMessage = String(environment.statusErrorMessage || "").trim();
  useEffect(() => {
    setDetailLabel(environment.displayName ?? environment.providerEnvironmentId);

    return () => {
      setDetailLabel(null);
    };
  }, [environment.displayName, environment.providerEnvironmentId, setDetailLabel]);

  const updateEnvironmentStatusInStore = (
    nextEnvironmentId: string,
    status: string,
    store: {
      get(dataId: string): {
        setValue(value: string, key: string): void;
      } | null;
    },
  ) => {
    const environmentRecord = store.get(nextEnvironmentId);
    if (!environmentRecord) {
      return;
    }

    environmentRecord.setValue(status, "status");
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page">
        <CardContent className="grid gap-6 px-0">
          <PageTabs
            items={[
              { key: "overview", label: "Overview" },
              { key: "metrics", label: "Metrics" },
            ]}
            onSelect={(tab) => {
              void navigate({
                params: {
                  environmentId: environment.id,
                  organizationSlug,
                },
                search: { tab },
                to: OrganizationPath.route("/environments/$environmentId"),
              });
            }}
            selectedKey={selectedTab}
          />
          {errorMessage ? (
            <div className="mx-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
          {environmentStatusErrorMessage ? (
            <div className="mx-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Live environment status is temporarily unavailable. {environmentStatusErrorMessage}
            </div>
          ) : null}

          {selectedTab === "overview" ? (
            <EnvironmentOverviewTab
              actingEnvironmentId={actingEnvironmentId}
              environment={environmentOverview}
              onOpenDesktop={async (nextEnvironmentId) => {
                if (isEnvironmentActionInFlight) {
                  return;
                }

                setErrorMessage(null);
                setActingEnvironmentId(nextEnvironmentId);

                try {
                  await new Promise<void>((resolve, reject) => {
                    commitGetEnvironmentVncUrl({
                      variables: {
                        input: {
                          id: nextEnvironmentId,
                        },
                      },
                      onCompleted: (response, errors) => {
                        const nextErrorMessage = errors?.[0]?.message;
                        if (nextErrorMessage) {
                          reject(new Error(nextErrorMessage));
                          return;
                        }

                        const url = response.GetEnvironmentVncUrl?.url;
                        if (!url) {
                          reject(new Error("Environment desktop URL was not returned."));
                          return;
                        }

                        window.open(url, "_blank", "noopener,noreferrer");
                        resolve();
                      },
                      onError: reject,
                    });
                  });
                } catch (error: unknown) {
                  setErrorMessage(error instanceof Error ? error.message : "Failed to open environment desktop.");
                } finally {
                  setActingEnvironmentId(null);
                }
              }}
              onOpenTerminal={async (nextEnvironmentId) => {
                window.open(
                  OrganizationPath.href(
                    organizationSlug,
                    `/environments/${encodeURIComponent(nextEnvironmentId)}/terminal`,
                  ),
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
              onStart={async (nextEnvironmentId) => {
                if (isEnvironmentActionInFlight) {
                  return;
                }

                setErrorMessage(null);
                setActingEnvironmentId(nextEnvironmentId);

                try {
                  await new Promise<void>((resolve, reject) => {
                    commitStartEnvironment({
                      variables: {
                        input: {
                          id: nextEnvironmentId,
                        },
                      },
                      updater: (store) => {
                        const startedEnvironment = store.getRootField("StartEnvironment");
                        if (!startedEnvironment) {
                          return;
                        }

                        updateEnvironmentStatusInStore(startedEnvironment.getDataID(), "running", store);
                      },
                      onCompleted: (_response, errors) => {
                        const nextErrorMessage = errors?.[0]?.message;
                        if (nextErrorMessage) {
                          reject(new Error(nextErrorMessage));
                          return;
                        }

                        resolve();
                      },
                      onError: reject,
                    });
                  });
                } catch (error: unknown) {
                  setErrorMessage(error instanceof Error ? error.message : "Failed to start environment.");
                } finally {
                  setActingEnvironmentId(null);
                }
              }}
              onStop={async (nextEnvironmentId) => {
                if (isEnvironmentActionInFlight) {
                  return;
                }

                setErrorMessage(null);
                setActingEnvironmentId(nextEnvironmentId);

                try {
                  await new Promise<void>((resolve, reject) => {
                    commitStopEnvironment({
                      variables: {
                        input: {
                          id: nextEnvironmentId,
                        },
                      },
                      updater: (store) => {
                        const stoppedEnvironment = store.getRootField("StopEnvironment");
                        if (!stoppedEnvironment) {
                          return;
                        }

                        updateEnvironmentStatusInStore(stoppedEnvironment.getDataID(), "stopped", store);
                      },
                      onCompleted: (_response, errors) => {
                        const nextErrorMessage = errors?.[0]?.message;
                        if (nextErrorMessage) {
                          reject(new Error(nextErrorMessage));
                          return;
                        }

                        resolve();
                      },
                      onError: reject,
                    });
                  });
                } catch (error: unknown) {
                  setErrorMessage(error instanceof Error ? error.message : "Failed to stop environment.");
                } finally {
                  setActingEnvironmentId(null);
                }
              }}
            />
          ) : (
            <EnvironmentMetricsTab
              diskSpaceGb={environment.diskSpaceGb}
              environmentId={environment.id}
              memoryGb={environment.memoryGb}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export function EnvironmentDetailPage() {
  return (
    <Suspense fallback={<EnvironmentDetailPageFallback />}>
      <EnvironmentDetailPageContent />
    </Suspense>
  );
}
