import { desc, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { companies, walletTransactions, wallets } from "../../db/schema.ts";
import { CompanyWalletService } from "../../services/wallet/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type WalletRow = {
  amountNanoUsd: number;
  id: string;
  type: string;
};

type WalletTransactionRow = {
  amountNanoUsd: number;
  category: string;
  createdAt: Date;
  id: string;
  periodEnd: Date | null;
  periodStart: Date | null;
  sessionId: string | null;
  sessionTurnId: string | null;
  walletId: string;
};

type CompanyWalletPlanRow = {
  pendingPlan: string | null;
  pendingPlanEffectiveAt: Date | null;
  plan: string;
};

/**
 * Exposes company wallet state used by managed-model enforcement so the usage dashboard shows the
 * exact balance gate and recent ledger entries instead of obsolete daily or monthly caps.
 */
@injectable()
export class CompanyWalletQueryResolver {
  execute = async (
    _root: unknown,
    _arguments: unknown,
    context: GraphqlRequestContext,
  ) => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const companyId = context.authSession.company.id;
    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const [company] = await tx
        .select({
          pendingPlan: companies.pendingPlan,
          pendingPlanEffectiveAt: companies.pendingPlanEffectiveAt,
          plan: companies.plan,
        })
        .from(companies)
        .where(eq(companies.id, companyId)) as CompanyWalletPlanRow[];
      if (!company) {
        throw new Error("Company not found.");
      }

      const walletRows = await tx
        .select({
          amountNanoUsd: wallets.amountNanoUsd,
          id: wallets.id,
          type: wallets.type,
        })
        .from(wallets)
        .where(eq(wallets.companyId, companyId)) as WalletRow[];
      const transactionRows = await tx
        .select({
          amountNanoUsd: walletTransactions.amountNanoUsd,
          category: walletTransactions.category,
          createdAt: walletTransactions.createdAt,
          id: walletTransactions.id,
          periodEnd: walletTransactions.periodEnd,
          periodStart: walletTransactions.periodStart,
          sessionId: walletTransactions.sessionId,
          sessionTurnId: walletTransactions.sessionTurnId,
          walletId: walletTransactions.walletId,
        })
        .from(walletTransactions)
        .where(eq(walletTransactions.companyId, companyId))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(10) as WalletTransactionRow[];
      const totalBalanceNanoUsd = walletRows.reduce((total, wallet) => total + wallet.amountNanoUsd, 0);
      const walletService = new CompanyWalletService();
      const nextPeriod = walletService.resolveSubscriptionPeriod(new Date()).periodEnd;

      return {
        currentPlan: company.plan,
        nextRechargeAmountNanoUsd: walletService.getMonthlyRechargeAmount((company.pendingPlan ?? company.plan) as "free" | "pro"),
        nextRechargeAt: nextPeriod.toISOString(),
        pendingPlan: company.pendingPlan,
        pendingPlanEffectiveAt: company.pendingPlanEffectiveAt?.toISOString() ?? null,
        totalBalanceNanoUsd,
        transactions: transactionRows.map((transaction) => ({
          ...transaction,
          createdAt: transaction.createdAt.toISOString(),
          periodEnd: transaction.periodEnd?.toISOString() ?? null,
          periodStart: transaction.periodStart?.toISOString() ?? null,
        })),
        wallets: walletRows,
      };
    });
  };
}
