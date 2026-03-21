/**
 * Describes the transactional subset the auth provider needs for sign-up writes.
 */
export interface AppDatabaseTransactionInterface {
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
}
