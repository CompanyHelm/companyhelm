import type { AppDatabaseTransactionInterface } from "./app_database_transaction_interface.ts";

/**
 * Captures the narrow database chaining surface used by the auth provider without leaking Drizzle types.
 */
export interface AppDatabaseInterface {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<unknown[]>;
      };
    };
  };
  transaction?<T>(callback: (transaction: AppDatabaseTransactionInterface) => Promise<T>): Promise<T>;
}
