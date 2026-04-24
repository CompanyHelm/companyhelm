import type {
  AppRuntimeTransaction,
  TransactionProviderInterface,
} from "./transaction_provider_interface.ts";

type CompanyScopedDatabase = {
  withCompanyContext<T>(companyId: string, callback: (tx: unknown) => Promise<T>): Promise<T>;
};

/**
 * Provides request-scoped runtime transactions that always carry the authenticated company setting.
 */
export class AppRuntimeTransactionProvider implements TransactionProviderInterface {
  private readonly appRuntimeDatabase: CompanyScopedDatabase;
  private readonly companyId: string;

  constructor(appRuntimeDatabase: CompanyScopedDatabase, companyId: string) {
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
