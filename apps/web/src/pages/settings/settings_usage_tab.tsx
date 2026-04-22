import { Suspense, useMemo } from "react";
import { Link } from "@tanstack/react-router";
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
import { formatProviderCredentialType, formatProviderLabel } from "../model-provider-credentials/provider_label";
import type { settingsUsageTabQuery } from "./__generated__/settingsUsageTabQuery.graphql";

const settingsUsageTabQueryNode = graphql`
  query settingsUsageTabQuery($dailyStart: String!, $monthlyStart: String!) {
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

function SettingsUsageTabFallback() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );
}

function SettingsUsageTabContent() {
  const organizationSlug = useCurrentOrganizationSlug();
  const data = useLazyLoadQuery<settingsUsageTabQuery>(
    settingsUsageTabQueryNode,
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
    <div className="grid gap-6">
      <UsageSummaryPanel
        aggregates={companyAggregates}
        description={`Company-wide LLM spend, token volume, and request count for ${data.Me.company.name}. Daily and monthly buckets are UTC-aligned to match the aggregate ledger.`}
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
              {providerRows.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                    No provider credentials found.
                  </TableCell>
                </TableRow>
              ) : null}

              {providerRows.map(({ credential, total }) => (
                <TableRow key={credential.id}>
                  <TableCell>
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="truncate font-medium text-foreground">{credential.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatProviderCredentialType(String(credential.type))}
                      </span>
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
    </div>
  );
}

/**
 * Keeps the aggregate-heavy usage query scoped to the Settings usage tab, so normal settings
 * visits do not also ask the API for company and provider usage rollups.
 */
export function SettingsUsageTab() {
  return (
    <Suspense fallback={<SettingsUsageTabFallback />}>
      <SettingsUsageTabContent />
    </Suspense>
  );
}
