import { AppRuntimeDatabase } from "./app_runtime_database.ts";
import type {
  AppRuntimeTransaction,
  TransactionProviderInterface,
} from "./transaction_provider_interface.ts";

/**
 * Provides request-scoped runtime transactions that always carry the authenticated company setting.
 */
export class AppRuntimeTransactionProvider implements TransactionProviderInterface {
  private readonly appRuntimeDatabase: AppRuntimeDatabase;
  private readonly companyId: string;

  constructor(appRuntimeDatabase: AppRuntimeDatabase, companyId: string) {
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.companyId = String(companyId || "").trim();
  }

  async transaction<T>(transaction: (tx: AppRuntimeTransaction) => Promise<T>): Promise<T> {
    if (!this.companyId) {
      throw new Error("Authentication required.");
    }

    return this.appRuntimeDatabase.withCompanyContext(this.companyId, async (tx) => {
      return transaction(tx as AppRuntimeTransaction);
    });
  }
}
