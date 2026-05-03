import { and, desc, eq, sql } from "drizzle-orm";
import { injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { companies, companyMembers, llmUsageAggregates, walletTransactions, wallets } from "../../db/schema.ts";
import type { AppRuntimeTransaction } from "../../db/transaction_provider_interface.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type PlatformAdminCompanyArguments = {
  id: string;
};

type PlatformAdminCompanyWalletsArguments = {
  companyId: string;
};

type PlatformAdminCompanyWalletArguments = {
  companyId: string;
  walletId: string;
};

type CompanyRow = {
  id: string;
  memberCount: number;
  name: string;
  plan: "free" | "pro";
  slug: string | null;
};

type UsageRow = {
  cacheReadCostNanoUsd: number;
  cacheReadCostNanoVirtualUsd: number;
  cacheReadTokens: number;
  cacheWriteCostNanoUsd: number;
  cacheWriteCostNanoVirtualUsd: number;
  cacheWriteTokens: number;
  inputCostNanoUsd: number;
  inputCostNanoVirtualUsd: number;
  inputTokens: number;
  outputCostNanoUsd: number;
  outputCostNanoVirtualUsd: number;
  outputTokens: number;
  requestCount: number;
  totalCostNanoUsd: number;
  totalCostNanoVirtualUsd: number;
  totalTokens: number;
};

type WalletRow = {
  amountNanoUsd: number;
  companyId: string;
  createdAt: Date;
  id: string;
  transactionCount: number;
  type: string;
  updatedAt: Date;
};

type TransactionRow = {
  amountNanoUsd: number;
  category: string;
  companyId: string;
  createdAt: Date;
  id: string;
  periodEnd: Date | null;
  periodStart: Date | null;
  sessionId: string | null;
  sessionTurnId: string | null;
  walletId: string;
};

type GraphqlUsage = UsageRow;

type GraphqlWallet = Omit<WalletRow, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type GraphqlTransaction = Omit<TransactionRow, "createdAt" | "periodEnd" | "periodStart"> & {
  createdAt: string;
  periodEnd: string | null;
  periodStart: string | null;
};

type GraphqlCompanyDetail = CompanyRow & {
  usage: GraphqlUsage;
  wallets: GraphqlWallet[];
};

type GraphqlWalletDetail = {
  company: CompanyRow;
  transactions: GraphqlTransaction[];
  wallet: GraphqlWallet;
};

const emptyUsage: GraphqlUsage = {
  cacheReadCostNanoUsd: 0,
  cacheReadCostNanoVirtualUsd: 0,
  cacheReadTokens: 0,
  cacheWriteCostNanoUsd: 0,
  cacheWriteCostNanoVirtualUsd: 0,
  cacheWriteTokens: 0,
  inputCostNanoUsd: 0,
  inputCostNanoVirtualUsd: 0,
  inputTokens: 0,
  outputCostNanoUsd: 0,
  outputCostNanoVirtualUsd: 0,
  outputTokens: 0,
  requestCount: 0,
  totalCostNanoUsd: 0,
  totalCostNanoVirtualUsd: 0,
  totalTokens: 0,
};

/**
 * Reads platform-admin wallet and all-time usage views for any company. These queries deliberately
 * run through the platform-admin RLS binding because the target company is selected by URL instead
 * of by the authenticated request's active organization.
 */
@injectable()
export class PlatformAdminCompanyWalletsQueryResolver {
  executeCompany = async (
    _root: unknown,
    arguments_: PlatformAdminCompanyArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlCompanyDetail> => {
    this.assertPlatformAdminContext(context);

    return context.app_runtime_transaction_provider!.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const company = await this.loadCompany(tx, arguments_.id);
      const [usageRows, walletRows] = await Promise.all([
        this.loadCompanyUsage(tx, company.id),
        this.loadWallets(tx, company.id),
      ]);

      return {
        ...company,
        usage: usageRows[0] ?? emptyUsage,
        wallets: walletRows.map(PlatformAdminCompanyWalletsQueryResolver.serializeWallet),
      };
    });
  };

  executeWallets = async (
    _root: unknown,
    arguments_: PlatformAdminCompanyWalletsArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlWallet[]> => {
    this.assertPlatformAdminContext(context);

    return context.app_runtime_transaction_provider!.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      await this.loadCompany(tx, arguments_.companyId);
      const walletRows = await this.loadWallets(tx, arguments_.companyId);
      return walletRows.map(PlatformAdminCompanyWalletsQueryResolver.serializeWallet);
    });
  };

  executeWallet = async (
    _root: unknown,
    arguments_: PlatformAdminCompanyWalletArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlWalletDetail> => {
    this.assertPlatformAdminContext(context);

    return context.app_runtime_transaction_provider!.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const company = await this.loadCompany(tx, arguments_.companyId);
      const walletRows = await this.loadWallets(tx, arguments_.companyId);
      const wallet = walletRows.find((walletRow) => walletRow.id === arguments_.walletId) ?? null;
      if (!wallet) {
        throw new Error("Company wallet not found.");
      }

      const transactionRows = await tx
        .select({
          amountNanoUsd: walletTransactions.amountNanoUsd,
          category: walletTransactions.category,
          companyId: walletTransactions.companyId,
          createdAt: walletTransactions.createdAt,
          id: walletTransactions.id,
          periodEnd: walletTransactions.periodEnd,
          periodStart: walletTransactions.periodStart,
          sessionId: walletTransactions.sessionId,
          sessionTurnId: walletTransactions.sessionTurnId,
          walletId: walletTransactions.walletId,
        })
        .from(walletTransactions)
        .where(and(
          eq(walletTransactions.companyId, arguments_.companyId),
          eq(walletTransactions.walletId, arguments_.walletId),
        ))
        .orderBy(desc(walletTransactions.createdAt)) as TransactionRow[];

      return {
        company,
        transactions: transactionRows.map(PlatformAdminCompanyWalletsQueryResolver.serializeTransaction),
        wallet: PlatformAdminCompanyWalletsQueryResolver.serializeWallet(wallet),
      };
    });
  };

  private assertPlatformAdminContext(context: GraphqlRequestContext): void {
    if (!context.authSession?.user || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (context.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }
  }

  private async loadCompany(tx: AppRuntimeTransaction, companyId: string): Promise<CompanyRow> {
    const companyRows = await tx
      .select({
        id: companies.id,
        memberCount: sql<number>`count(${companyMembers.userId})::int`.as("member_count"),
        name: companies.name,
        plan: companies.plan,
        slug: companies.slug,
      })
      .from(companies)
      .leftJoin(companyMembers, eq(companyMembers.companyId, companies.id))
      .where(eq(companies.id, companyId))
      .groupBy(
        companies.id,
        companies.name,
        companies.plan,
        companies.slug,
      ) as CompanyRow[];
    const company = companyRows[0];
    if (!company) {
      throw new Error("Company not found.");
    }

    return company;
  }

  private async loadCompanyUsage(tx: AppRuntimeTransaction, companyId: string): Promise<UsageRow[]> {
    return await tx
      .select({
        cacheReadCostNanoUsd: llmUsageAggregates.cacheReadCostNanoUsd,
        cacheReadCostNanoVirtualUsd: llmUsageAggregates.cacheReadCostNanoVirtualUsd,
        cacheReadTokens: llmUsageAggregates.cacheReadTokens,
        cacheWriteCostNanoUsd: llmUsageAggregates.cacheWriteCostNanoUsd,
        cacheWriteCostNanoVirtualUsd: llmUsageAggregates.cacheWriteCostNanoVirtualUsd,
        cacheWriteTokens: llmUsageAggregates.cacheWriteTokens,
        inputCostNanoUsd: llmUsageAggregates.inputCostNanoUsd,
        inputCostNanoVirtualUsd: llmUsageAggregates.inputCostNanoVirtualUsd,
        inputTokens: llmUsageAggregates.inputTokens,
        outputCostNanoUsd: llmUsageAggregates.outputCostNanoUsd,
        outputCostNanoVirtualUsd: llmUsageAggregates.outputCostNanoVirtualUsd,
        outputTokens: llmUsageAggregates.outputTokens,
        requestCount: llmUsageAggregates.requestCount,
        totalCostNanoUsd: llmUsageAggregates.totalCostNanoUsd,
        totalCostNanoVirtualUsd: llmUsageAggregates.totalCostNanoVirtualUsd,
        totalTokens: llmUsageAggregates.totalTokens,
      })
      .from(llmUsageAggregates)
      .where(and(
        eq(llmUsageAggregates.companyId, companyId),
        eq(llmUsageAggregates.scopeType, "company"),
        eq(llmUsageAggregates.period, "total"),
      ))
      .limit(1) as UsageRow[];
  }

  private async loadWallets(tx: AppRuntimeTransaction, companyId: string): Promise<WalletRow[]> {
    return await tx
      .select({
        amountNanoUsd: wallets.amountNanoUsd,
        companyId: wallets.companyId,
        createdAt: wallets.createdAt,
        id: wallets.id,
        transactionCount: sql<number>`count(${walletTransactions.id})::int`.as("transaction_count"),
        type: wallets.type,
        updatedAt: wallets.updatedAt,
      })
      .from(wallets)
      .leftJoin(walletTransactions, eq(walletTransactions.walletId, wallets.id))
      .where(eq(wallets.companyId, companyId))
      .groupBy(
        wallets.amountNanoUsd,
        wallets.companyId,
        wallets.createdAt,
        wallets.id,
        wallets.type,
        wallets.updatedAt,
      )
      .orderBy(wallets.type, wallets.id) as WalletRow[];
  }

  private static serializeWallet(wallet: WalletRow): GraphqlWallet {
    return {
      ...wallet,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    };
  }

  private static serializeTransaction(transaction: TransactionRow): GraphqlTransaction {
    return {
      ...transaction,
      createdAt: transaction.createdAt.toISOString(),
      periodEnd: transaction.periodEnd?.toISOString() ?? null,
      periodStart: transaction.periodStart?.toISOString() ?? null,
    };
  }
}
