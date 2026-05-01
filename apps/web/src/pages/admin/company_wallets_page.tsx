import { useParams } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsageMetrics } from "@/lib/usage_metrics";
import type { companyWalletsPageQuery } from "./__generated__/companyWalletsPageQuery.graphql";

const companyWalletsPageQueryNode = graphql`
  query companyWalletsPageQuery($companyId: ID!) {
    PlatformAdminCompany(id: $companyId) {
      id
      name
      slug
      plan
    }
    PlatformAdminCompanyWallets(companyId: $companyId) {
      id
      companyId
      type
      amountNanoUsd
      transactionCount
      createdAt
      updatedAt
    }
  }
`;

type CompanyWallet = companyWalletsPageQuery["response"]["PlatformAdminCompanyWallets"][number];

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

/**
 * Lists all wallets for a company in the platform-admin area so operators can choose the ledger
 * that needs inspection or a manual adjustment.
 */
export function AdminCompanyWalletsPage() {
  return (
    <PlatformAdminGuard>
      <AdminCompanyWalletsPageContent />
    </PlatformAdminGuard>
  );
}

function AdminCompanyWalletsPageContent() {
  const params = useParams({ strict: false }) as { companyId?: string };
  const companyId = params.companyId ?? "";
  const data = useLazyLoadQuery<companyWalletsPageQuery>(
    companyWalletsPageQueryNode,
    { companyId },
    { fetchPolicy: "store-and-network" },
  );
  const company = data.PlatformAdminCompany;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <Button asChild className="mb-4" size="sm" variant="ghost">
              <a href={`/admin/companies/${company.id}`}>
                <ArrowLeftIcon />
                Back
              </a>
            </Button>
            <CardTitle>{company.name} wallets</CardTitle>
            <CardDescription>{company.id}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {data.PlatformAdminCompanyWallets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              No wallets have been created for this company.
            </div>
          ) : (
            <WalletTable companyId={company.id} wallets={data.PlatformAdminCompanyWallets} />
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
          <TableHead>Created</TableHead>
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
            <TableCell>{formatTimestamp(wallet.createdAt)}</TableCell>
            <TableCell>{formatTimestamp(wallet.updatedAt)}</TableCell>
            <TableCell className="text-right">
              <Button asChild size="sm" variant="outline">
                <a href={`/admin/companies/${props.companyId}/wallets/${wallet.id}`}>
                  Open ledger
                </a>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
