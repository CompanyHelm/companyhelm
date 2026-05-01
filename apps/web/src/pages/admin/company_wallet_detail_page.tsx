import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { useToast } from "@/components/toast_provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsageMetrics } from "@/lib/usage_metrics";
import type { companyWalletDetailPageAdjustmentMutation } from "./__generated__/companyWalletDetailPageAdjustmentMutation.graphql";
import type { companyWalletDetailPageQuery } from "./__generated__/companyWalletDetailPageQuery.graphql";

const NANO_USD_PER_USD = 1_000_000_000;

const companyWalletDetailPageQueryNode = graphql`
  query companyWalletDetailPageQuery($companyId: ID!, $walletId: ID!) {
    PlatformAdminCompanyWallet(companyId: $companyId, walletId: $walletId) {
      company {
        id
        name
        slug
        plan
      }
      wallet {
        id
        companyId
        type
        amountNanoUsd
        transactionCount
        createdAt
        updatedAt
      }
      transactions {
        id
        companyId
        walletId
        category
        amountNanoUsd
        periodStart
        periodEnd
        sessionId
        sessionTurnId
        createdAt
      }
    }
  }
`;

const companyWalletDetailPageAdjustmentMutationNode = graphql`
  mutation companyWalletDetailPageAdjustmentMutation($input: AddPlatformAdminWalletAdjustmentInput!) {
    AddPlatformAdminWalletAdjustment(input: $input) {
      id
      companyId
      walletId
      category
      amountNanoUsd
      createdAt
    }
  }
`;

type WalletTransaction = companyWalletDetailPageQuery["response"]["PlatformAdminCompanyWallet"]["transactions"][number];

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

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

function formatCategory(category: string): string {
  if (category === "llm_charge") {
    return "LLM charge";
  }
  if (category === "monthly_recharge") {
    return "Monthly recharge";
  }
  if (category === "opening") {
    return "Opening";
  }
  if (category === "adjustment") {
    return "Adjustment";
  }

  return category;
}

function resolveAdjustmentNanoUsd(value: string): number {
  const amountUsd = Number(value);
  if (!Number.isFinite(amountUsd)) {
    throw new Error("Enter a valid USD amount.");
  }

  const amountNanoUsd = Math.round(amountUsd * NANO_USD_PER_USD);
  if (!Number.isSafeInteger(amountNanoUsd) || amountNanoUsd === 0) {
    throw new Error("Adjustment must be a non-zero safe USD amount.");
  }

  return amountNanoUsd;
}

/**
 * Shows the complete transaction ledger for one company wallet and exposes manual adjustment
 * creation for platform admins who need to correct a balance without direct database access.
 */
export function AdminCompanyWalletDetailPage() {
  return (
    <PlatformAdminGuard>
      <AdminCompanyWalletDetailPageContent />
    </PlatformAdminGuard>
  );
}

function AdminCompanyWalletDetailPageContent() {
  const params = useParams({ strict: false }) as { companyId?: string; walletId?: string };
  const companyId = params.companyId ?? "";
  const walletId = params.walletId ?? "";
  const toast = useToast();
  const [fetchKey, setFetchKey] = useState(0);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [adjustmentAmountUsd, setAdjustmentAmountUsd] = useState("");
  const [adjustmentErrorMessage, setAdjustmentErrorMessage] = useState<string | null>(null);
  const data = useLazyLoadQuery<companyWalletDetailPageQuery>(
    companyWalletDetailPageQueryNode,
    { companyId, walletId },
    {
      fetchKey,
      fetchPolicy: "store-and-network",
    },
  );
  const [commitAdjustment, isAdjustmentInFlight] =
    useMutation<companyWalletDetailPageAdjustmentMutation>(companyWalletDetailPageAdjustmentMutationNode);
  const detail = data.PlatformAdminCompanyWallet;

  const closeAdjustmentDialog = () => {
    setAdjustmentDialogOpen(false);
    setAdjustmentAmountUsd("");
    setAdjustmentErrorMessage(null);
  };

  const addAdjustment = () => {
    let amountNanoUsd: number;
    try {
      amountNanoUsd = resolveAdjustmentNanoUsd(adjustmentAmountUsd);
    } catch (error) {
      setAdjustmentErrorMessage(error instanceof Error ? error.message : "Enter a valid USD amount.");
      return;
    }

    setAdjustmentErrorMessage(null);
    commitAdjustment({
      variables: {
        input: {
          amountNanoUsd,
          companyId: detail.company.id,
          walletId: detail.wallet.id,
        },
      },
      onCompleted: (_response, errors) => {
        const nextErrorMessage = String(errors?.[0]?.message || "").trim();
        if (nextErrorMessage) {
          setAdjustmentErrorMessage(nextErrorMessage);
          return;
        }

        closeAdjustmentDialog();
        setFetchKey((current) => current + 1);
        toast.showSavedToast("Adjustment added");
      },
      onError: (error) => {
        setAdjustmentErrorMessage(error.message);
      },
    });
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <Button asChild className="mb-4" size="sm" variant="ghost">
              <a href={`/admin/companies/${detail.company.id}/wallets`}>
                <ArrowLeftIcon />
                Back
              </a>
            </Button>
            <CardTitle>{formatWalletType(detail.wallet.type)} wallet</CardTitle>
            <CardDescription>
              {detail.company.name} - {detail.wallet.id}
            </CardDescription>
          </div>
          <CardAction>
            <Button size="sm" onClick={() => setAdjustmentDialogOpen(true)}>
              <PlusIcon />
              Adjustment
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant={detail.wallet.amountNanoUsd < 0 ? "destructive" : "outline"}>
              Balance: {UsageMetrics.formatUsdFromNano(detail.wallet.amountNanoUsd)}
            </Badge>
            <Badge variant="outline">{detail.wallet.transactionCount} transactions</Badge>
            <Badge variant="secondary">Updated {formatTimestamp(detail.wallet.updatedAt)}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>Full ledger ordered by newest transaction first.</CardDescription>
        </CardHeader>
        <CardContent>
          {detail.transactions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              This wallet has no transactions.
            </div>
          ) : (
            <TransactionTable transactions={detail.transactions} />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={adjustmentDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeAdjustmentDialog();
          }
        }}
      >
        <DialogContent className="w-[min(92vw,30rem)]">
          <DialogHeader>
            <DialogTitle>Add adjustment</DialogTitle>
            <DialogDescription>
              Enter a positive or negative USD amount. It will be recorded as an adjustment transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="wallet-adjustment-amount">
              Amount USD
            </label>
            <Input
              aria-invalid={adjustmentErrorMessage ? true : undefined}
              disabled={isAdjustmentInFlight}
              id="wallet-adjustment-amount"
              inputMode="decimal"
              onChange={(event) => setAdjustmentAmountUsd(event.target.value)}
              placeholder="-25.00"
              value={adjustmentAmountUsd}
            />
            {adjustmentErrorMessage ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {adjustmentErrorMessage}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeAdjustmentDialog}>
              Cancel
            </Button>
            <Button disabled={isAdjustmentInFlight} size="sm" onClick={addAdjustment}>
              Add adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function TransactionTable(props: {
  transactions: readonly WalletTransaction[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Transaction</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Session turn</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell>
              <div className="font-medium text-foreground">{formatCategory(transaction.category)}</div>
              <div className="text-xs text-muted-foreground">{transaction.id}</div>
            </TableCell>
            <TableCell>{UsageMetrics.formatUsdFromNano(transaction.amountNanoUsd)}</TableCell>
            <TableCell>
              <div className="text-xs text-muted-foreground">
                {formatTimestamp(transaction.periodStart)} - {formatTimestamp(transaction.periodEnd)}
              </div>
            </TableCell>
            <TableCell>
              <div className="max-w-56 truncate text-xs text-muted-foreground">
                {transaction.sessionTurnId ?? transaction.sessionId ?? "-"}
              </div>
            </TableCell>
            <TableCell>{formatTimestamp(transaction.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
