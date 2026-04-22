import { Suspense, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ChartColumnIcon } from "lucide-react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { UsageSummaryPanel } from "@/components/usage/usage_summary_panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrganizationPath } from "@/lib/organization_path";
import { UsageMetrics } from "@/lib/usage_metrics";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { formatProviderLabel } from "../model-provider-credentials/provider_label";
import type { usagePageQuery } from "./__generated__/usagePageQuery.graphql";

const usagePageQueryNode = graphql`
  query usagePageQuery($dailyStart: String!, $monthlyStart: String!) {
    Me {
      company {
        id
        name
      }
    }
    companyTotal: LlmUsageAggregates(input: { scopeType: company, period: total }) {
      cacheReadCostNanoUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputTokens
      outputCostNanoUsd
      outputTokens
      period
      periodStart
      requestCount
      scopeId
      scopeType
      totalCostNanoUsd
      totalTokens
    }
    companyDaily: LlmUsageAggregates(input: { scopeType: company, period: day, periodStartAfter: $dailyStart }) {
      cacheReadCostNanoUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputTokens
      outputCostNanoUsd
      outputTokens
      period
      periodStart
      requestCount
      scopeId
      scopeType
      totalCostNanoUsd
      totalTokens
    }
    companyMonthly: LlmUsageAggregates(input: { scopeType: company, period: month, periodStartAfter: $monthlyStart }) {
      cacheReadCostNanoUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputTokens
      outputCostNanoUsd
      outputTokens
      period
      periodStart
      requestCount
      scopeId
      scopeType
      totalCostNanoUsd
      totalTokens
    }
    providerTotals: LlmUsageAggregates(input: { scopeType: provider, period: total }) {
      cacheReadCostNanoUsd
      cacheReadTokens
      cacheWriteCostNanoUsd
      cacheWriteTokens
      inputCostNanoUsd
      inputTokens
      outputCostNanoUsd
      outputTokens
      period
      periodStart
      requestCount
      scopeId
      scopeType
      totalCostNanoUsd
      totalTokens
    }
    ModelProviderCredentials {
      id
      baseUrl
      isManaged
      name
      modelProvider
      status
      type
    }
  }
`;

function UsagePageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ChartColumnIcon className="size-4" />
        <span>Usage</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
      <Skeleton className="h-80 rounded-lg" />
    </main>
  );
}

function UsagePageContent() {
  const organizationSlug = useCurrentOrganizationSlug();
  const data = useLazyLoadQuery<usagePageQuery>(
    usagePageQueryNode,
    {
      dailyStart: UsageMetrics.resolveUtcDayStart(29),
      monthlyStart: UsageMetrics.resolveUtcMonthStart(11),
    },
    {
      fetchPolicy: "store-and-network",
    },
  );
  const companyAggregates = useMemo(() => {
    return UsageMetrics.fromGraphqlAggregates([
      ...data.companyTotal,
      ...data.companyDaily,
      ...data.companyMonthly,
    ]);
  }, [data.companyDaily, data.companyMonthly, data.companyTotal]);
  const providerTotals = useMemo(() => {
    return UsageMetrics.fromGraphqlAggregates(data.providerTotals);
  }, [data.providerTotals]);
  const providerRows = useMemo(() => {
    return data.ModelProviderCredentials.map((credential) => {
      const total = UsageMetrics.findTotalAggregate(providerTotals, "provider", credential.id);

      return {
        credential,
        total,
      };
    }).sort((left, right) => {
      return right.total.totalCostNanoUsd - left.total.totalCostNanoUsd;
    });
  }, [data.ModelProviderCredentials, providerTotals]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ChartColumnIcon className="size-4" />
          <span>Usage</span>
        </div>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Company-wide LLM spend, token volume, and provider contribution for {data.Me.company.name}.
        </p>
      </div>

      <UsageSummaryPanel
        aggregates={companyAggregates}
        description="Rollup across every agent session in the company. Daily and monthly buckets are UTC-aligned to match the aggregate ledger."
        scopeId={data.Me.company.id}
        scopeType="company"
        title="Company usage"
      />

      <Card variant="page" className="rounded-lg border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Provider breakdown</CardTitle>
            <CardDescription>
              Spend and token volume grouped by model provider credential.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credential</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="w-24 text-right">Usage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providerRows.map(({ credential, total }) => (
                <TableRow key={credential.id}>
                  <TableCell>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="truncate font-medium text-foreground">{credential.name}</span>
                      <span className="text-xs text-muted-foreground">{credential.type === "oauth_token" ? "OAuth token" : "API key"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {formatProviderLabel(String(credential.modelProvider), {
                          baseUrl: credential.baseUrl ?? null,
                          isManaged: credential.isManaged,
                        })}
                      </Badge>
                      {credential.status === "error" ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {UsageMetrics.formatUsdFromNano(total.totalCostNanoUsd)}
                  </TableCell>
                  <TableCell className="text-right">
                    {UsageMetrics.formatTokenCount(total.totalTokens)}
                  </TableCell>
                  <TableCell className="text-right">
                    {UsageMetrics.formatRequestCount(total.requestCount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      render={(
                        <Link
                          params={{
                            credentialId: credential.id,
                            organizationSlug,
                          }}
                          search={{
                            tab: "usage",
                          }}
                          to={OrganizationPath.route("/model-provider-credentials/$credentialId")}
                        />
                      )}
                      size="sm"
                      variant="outline"
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}

export function UsagePage() {
  return (
    <Suspense fallback={<UsagePageFallback />}>
      <UsagePageContent />
    </Suspense>
  );
}
