import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import type * as schema from "./schema.ts";

export type AppRuntimeFullSchema = typeof schema;
export type AppRuntimeSchema = ExtractTablesWithRelations<AppRuntimeFullSchema>;
export type AppRuntimeTransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  AppRuntimeFullSchema,
  AppRuntimeSchema
>;

/**
 * Defines the request-scoped transaction surface used by GraphQL handlers that operate within the
 * authenticated company context.
 */
export interface TransactionProviderInterface {
  /**
   * Runs the callback inside a company-bound runtime transaction. The provider owns transaction
   * creation so callers cannot accidentally forget to scope the session before issuing queries.
   */
  transaction<T>(transaction: (tx: AppRuntimeTransaction) => Promise<T>): Promise<T>;
}
