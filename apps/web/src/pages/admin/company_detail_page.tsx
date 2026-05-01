import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeftIcon, WalletIcon } from "lucide-react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsageMetrics } from "@/lib/usage_metrics";
import type { companyDetailPageQuery } from "./__generated__/companyDetailPageQuery.graphql";

const companyDetailPageQueryNode = graphql`
  query companyDetailPageQuery($companyId: ID!) {
    PlatformAdminCompany(id: $companyId) {
      id
      name
      slug
      plan
      clerkOrganizationId
      memberCount
      usage {
        requestCount
        inputTokens
        outputTokens
        cacheReadTokens
        cacheWriteTokens
        totalTokens
        totalCostNanoUsd
        totalCostNanoVirtualUsd
      }
      wallets {
        id
        companyId
        type
        amountNanoUsd
        transactionCount
        updatedAt
      }
    }
  }
`;

type CompanyWallet = companyDetailPageQuery["response"]["PlatformAdminCompany"]["wallets"][number];

function formatPlanLabel(plan: string): string {
  return plan === "pro" ? "Pro" : "Free";
}

function formatOptionalValue(value: string | null | undefined): string {
  return value && value.length > 0 ? value : "-";
}

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

function formatWalletType(type: string): string {
  return type === "pay_as_you_go" ? "Pay as you go" : "Subscription";
}

function UsageMetricTile(props: {
  description: string;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-4">
      <p className="text-xs font-medium text-muted-foreground">{props.title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{props.value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{props.description}</p>
    </div>
  );
}

/**
 * Shows one company's platform-admin overview, with all-time managed usage separated into actual
 * provider spend and virtual wallet spend before linking into the wallet ledger tools.
 */
export function AdminCompanyDetailPage() {
  return (
    <PlatformAdminGuard>
      <AdminCompanyDetailPageContent />
    </PlatformAdminGuard>
  );
}

function AdminCompanyDetailPageContent() {
  const params = useParams({ strict: false }) as { companyId?: string };
  const companyId = params.companyId ?? "";
  const data = useLazyLoadQuery<companyDetailPageQuery>(
    companyDetailPageQueryNode,
    { companyId },
    { fetchPolicy: "store-and-network" },
  );
  const company = data.PlatformAdminCompany;
  const usage = company.usage;
  const cacheTokens = usage.cacheReadTokens + usage.cacheWriteTokens;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <Button asChild className="mb-4" size="sm" variant="ghost">
              <Link to="/admin/companies">
                <ArrowLeftIcon />
                Back
              </Link>
            </Button>
            <CardTitle>{company.name}</CardTitle>
            <CardDescription>
              {company.id} {company.slug ? `- ${company.slug}` : ""}
            </CardDescription>
          </div>
          <CardAction>
            <Button asChild size="sm">
              <a href={`/admin/companies/${company.id}/wallets`}>
                <WalletIcon />
                Wallets
              </a>
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{formatPlanLabel(company.plan)} plan</Badge>
            <Badge variant="outline">{company.memberCount} members</Badge>
            <Badge variant="secondary">Clerk: {formatOptionalValue(company.clerkOrganizationId)}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <UsageMetricTile
              description="Provider-billed all-time cost across company usage."
              title="Actual spend"
              value={UsageMetrics.formatUsdFromNano(usage.totalCostNanoUsd)}
            />
            <UsageMetricTile
              description="CompanyHelm-managed virtual wallet cost."
              title="Virtual spend"
              value={UsageMetrics.formatUsdFromNano(usage.totalCostNanoVirtualUsd)}
            />
            <UsageMetricTile
              description={`${UsageMetrics.formatTokenCount(usage.inputTokens)} input, ${UsageMetrics.formatTokenCount(usage.outputTokens)} output, ${UsageMetrics.formatTokenCount(cacheTokens)} cache`}
              title="Tokens"
              value={UsageMetrics.formatTokenCount(usage.totalTokens)}
            />
            <UsageMetricTile
              description="All-time aggregate request count."
              title="Requests"
              value={UsageMetrics.formatRequestCount(usage.requestCount)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Wallets</CardTitle>
          <CardDescription>Current wallet balances and transaction counts for this company.</CardDescription>
        </CardHeader>
        <CardContent>
          {company.wallets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              No wallets have been created for this company.
            </div>
          ) : (
            <WalletTable companyId={company.id} wallets={company.wallets} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function WalletTable(props: {
  companyId: string;
  wallets: readonly CompanyWallet[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Wallet</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Transactions</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.wallets.map((wallet) => (
          <TableRow key={wallet.id}>
            <TableCell>
              <div className="font-medium text-foreground">{formatWalletType(wallet.type)}</div>
              <div className="text-xs text-muted-foreground">{wallet.id}</div>
            </TableCell>
            <TableCell>{UsageMetrics.formatUsdFromNano(wallet.amountNanoUsd)}</TableCell>
            <TableCell>{wallet.transactionCount}</TableCell>
            <TableCell>{formatTimestamp(wallet.updatedAt)}</TableCell>
            <TableCell className="text-right">
              <Button asChild size="sm" variant="outline">
                <a href={`/admin/companies/${props.companyId}/wallets/${wallet.id}`}>
                  Open
                </a>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
