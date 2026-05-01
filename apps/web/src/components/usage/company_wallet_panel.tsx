import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsageMetrics } from "@/lib/usage_metrics";

export type CompanyWalletRecord = {
  currentPlan: string;
  nextRechargeAmountNanoUsd: number;
  nextRechargeAt: string;
  pendingPlan: string | null | undefined;
  pendingPlanEffectiveAt: string | null | undefined;
  totalBalanceNanoUsd: number;
  transactions: ReadonlyArray<{
    amountNanoUsd: number;
    category: string;
    createdAt: string;
    id: string;
  }>;
  wallets: ReadonlyArray<{
    amountNanoUsd: number;
    id: string;
    type: string;
  }>;
};

type CompanyWalletPanelProps = {
  budget: CompanyWalletRecord;
  description?: string;
  title?: string;
};

/**
 * Shows the CompanyHelm managed-model wallet balance and recent ledger entries. The wallet balance
 * is now the runtime enforcement source for CompanyHelm-managed session starts and messages.
 */
export function CompanyWalletPanel(props: CompanyWalletPanelProps) {
  const isDepleted = props.budget.totalBalanceNanoUsd <= 0;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold tracking-normal text-foreground">
            {props.title ?? "CompanyHelm wallet"}
          </h2>
          <Badge variant="secondary">{formatPlanLabel(props.budget.currentPlan)} plan</Badge>
          <Badge variant={isDepleted ? "destructive" : "outline"}>{isDepleted ? "Depleted" : "Active"}</Badge>
        </div>
        {props.description ? (
          <p className="max-w-3xl text-sm text-muted-foreground">{props.description}</p>
        ) : null}
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Available wallet balance</CardDescription>
            <CardTitle>{UsageMetrics.formatUsdFromNano(props.budget.totalBalanceNanoUsd)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            CompanyHelm-managed sessions are blocked when this balance is zero or negative.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Next recharge</CardDescription>
            <CardTitle>{UsageMetrics.formatUsdFromNano(props.budget.nextRechargeAmountNanoUsd)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Scheduled for {formatTimestamp(props.budget.nextRechargeAt)}.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Scheduled plan change</CardDescription>
            <CardTitle>{props.budget.pendingPlan ? formatPlanLabel(props.budget.pendingPlan) : "None"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {props.budget.pendingPlanEffectiveAt
              ? `Effective ${formatTimestamp(props.budget.pendingPlanEffectiveAt)}.`
              : "Current plan remains active for the next recharge."}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wallets</CardTitle>
          <CardDescription>Company-scoped balances used by the managed model gate.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.budget.wallets.map((wallet) => (
                <TableRow key={wallet.id}>
                  <TableCell>{formatWalletType(wallet.type)}</TableCell>
                  <TableCell className="text-right">{UsageMetrics.formatUsdFromNano(wallet.amountNanoUsd)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent wallet transactions</CardTitle>
          <CardDescription>Charges are written only for CompanyHelm-managed LLM usage.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.budget.transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{formatCategory(transaction.category)}</TableCell>
                  <TableCell>{formatTimestamp(transaction.createdAt)}</TableCell>
                  <TableCell className="text-right">{UsageMetrics.formatUsdFromNano(transaction.amountNanoUsd)}</TableCell>
                </TableRow>
              ))}
              {props.budget.transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No transactions yet.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}

function formatPlanLabel(value: string): string {
  return value === "pro" ? "Pro" : "Free";
}

function formatWalletType(value: string): string {
  return value === "pay_as_you_go" ? "Pay as you go" : "Subscription";
}

function formatCategory(value: string): string {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
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
