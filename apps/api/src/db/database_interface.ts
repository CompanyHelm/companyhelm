import type { Sql } from "postgres";

export type DatabaseTransactionInterface = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<unknown[]>;
      };
    };
  };
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
    };
  };
  execute?(query: unknown): Promise<unknown>;
};

export type DatabaseClientInterface = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<unknown[]>;
      };
    };
  };
  execute?(query: unknown): Promise<unknown>;
  transaction?<T>(callback: (transaction: DatabaseTransactionInterface) => Promise<T>): Promise<T>;
};

/**
 * Defines the minimal shared database surface exposed by role-specific connection owners.
 */
export interface DatabaseInterface {
  /**
   * Returns the role-bound Drizzle database used by higher-level application code.
   * Implementations may narrow the concrete driver type internally, but callers rely on this
   * shared query surface to avoid binding themselves to a specific role class.
   */
  getDatabase(): DatabaseClientInterface;

  /**
   * Returns the underlying postgres-js client for low-level operations that Drizzle does not model
   * directly, such as advisory locks or session-level bootstrap commands.
   */
  getSqlClient(): Sql;

  /**
   * Closes the owned database connection so long-running API or bootstrap processes do not leak
   * idle sockets across restarts.
   */
  close(): Promise<void>;
}
