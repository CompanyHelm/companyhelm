import { Suspense, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { graphql, useLazyLoadQuery } from "react-relay";
import { ErrorState } from "@/components/error_state";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page_tabs";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { EnvironmentMetricsTab } from "./environment_metrics_tab";
import { EnvironmentOverviewTab } from "./environment_overview_tab";
import type { environmentDetailPageQuery } from "./__generated__/environmentDetailPageQuery.graphql";

type EnvironmentDetailPageTab = "metrics" | "overview";

function createEnvironmentDetailMetricWindow() {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 60 * 60 * 1000);
  return {
    endTime: endTime.toISOString(),
    startTime: startTime.toISOString(),
  };
}

const environmentDetailPageQueryNode = graphql`
  query environmentDetailPageQuery($environmentId: ID!, $startTime: String!, $endTime: String!) {
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
    EnvironmentMetricSamples(environmentId: $environmentId, startTime: $startTime, endTime: $endTime) {
      sampledAt
      cpuUsedPct
      memUsedBytes
      diskUsedBytes
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
  const normalizedEnvironmentId = String(environmentId || "").trim();
  const selectedTab: EnvironmentDetailPageTab = search.tab === "metrics" ? "metrics" : "overview";

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

  const metricWindow = useMemo(
    () => createEnvironmentDetailMetricWindow(),
    [normalizedEnvironmentId, selectedTab],
  );
  const data = useLazyLoadQuery<environmentDetailPageQuery>(
    environmentDetailPageQueryNode,
    {
      endTime: metricWindow.endTime,
      environmentId: normalizedEnvironmentId,
      startTime: metricWindow.startTime,
    },
    {
      fetchPolicy: "store-or-network",
    },
  );
  const environment = data.Environment;
  const environmentOverview = {
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
    providerEnvironmentId: environment.providerEnvironmentId,
    status: environment.status,
    templateId: environment.templateId,
    updatedAt: environment.updatedAt,
  };
  useEffect(() => {
    setDetailLabel(environment.displayName ?? environment.providerEnvironmentId);

    return () => {
      setDetailLabel(null);
    };
  }, [environment.displayName, environment.providerEnvironmentId, setDetailLabel]);

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

          {selectedTab === "overview" ? (
            <EnvironmentOverviewTab environment={environmentOverview} organizationSlug={organizationSlug} />
          ) : (
            <EnvironmentMetricsTab samples={data.EnvironmentMetricSamples} />
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
