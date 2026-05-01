import { inject, injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { CompanyWalletService } from "../../services/wallet/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type AddPlatformAdminWalletAdjustmentMutationArguments = {
  input: {
    amountNanoUsd: number;
    companyId: string;
    walletId: string;
  };
};

type AddPlatformAdminWalletAdjustmentPayload = {
  amountNanoUsd: number;
  category: string;
  companyId: string;
  createdAt: string;
  id: string;
  periodEnd: string | null;
  periodStart: string | null;
  sessionId: string | null;
  sessionTurnId: string | null;
  walletId: string;
};

/**
 * Lets platform admins correct a company wallet with an explicit ledger adjustment. The transaction
 * insert and wallet balance update happen in one database transaction so the audit row and balance
 * cannot diverge.
 */
@injectable()
export class AddPlatformAdminWalletAdjustmentMutation extends Mutation<
  AddPlatformAdminWalletAdjustmentMutationArguments,
  AddPlatformAdminWalletAdjustmentPayload
> {
  private readonly walletService: CompanyWalletService;

  constructor(
    @inject(CompanyWalletService) walletService: CompanyWalletService = new CompanyWalletService(),
  ) {
    super();
    this.walletService = walletService;
  }

  protected resolve = async (
    arguments_: AddPlatformAdminWalletAdjustmentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<AddPlatformAdminWalletAdjustmentPayload> => {
    if (!context.authSession?.user || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (context.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const transaction = await this.walletService.recordAdjustmentInTransaction(tx as never, {
        amountNanoUsd: arguments_.input.amountNanoUsd,
        companyId: arguments_.input.companyId,
        walletId: arguments_.input.walletId,
      });

      return {
        amountNanoUsd: transaction.amountNanoUsd,
        category: transaction.category,
        companyId: transaction.companyId,
        createdAt: transaction.createdAt.toISOString(),
        id: transaction.id,
        periodEnd: transaction.periodEnd?.toISOString() ?? null,
        periodStart: transaction.periodStart?.toISOString() ?? null,
        sessionId: transaction.sessionId,
        sessionTurnId: transaction.sessionTurnId,
        walletId: transaction.walletId,
      };
    });
  };
}
