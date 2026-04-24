import type { FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { AuthProvider, type AuthRuntimeDatabase, type AuthSession } from "../auth/auth_provider.ts";
import { AuthProviderFactory } from "../auth/auth_provider_factory.ts";
import { DevAuthHeaders } from "../auth/dev/headers.ts";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../db/app_runtime_transaction_provider.ts";
import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";
import type { RedisCompanyScopedService } from "../services/redis/company_scoped_service.ts";

export type GraphqlRequestContext = {
  authSession: AuthSession | null;
  app_runtime_transaction_provider: TransactionProviderInterface | null;
  redisCompanyScopedService?: RedisCompanyScopedService | null;
  resolveSubscriptionContext?: (() => Promise<GraphqlRequestContext>) | null;
};

/**
 * Resolves GraphQL request auth from either the configured bearer token flow or the explicit dev
 * impersonation headers so downstream resolvers can trust the company context.
 */
@injectable()
export class GraphqlRequestContextResolver {
  private readonly authProvider: AuthProvider;
  private readonly database: AuthRuntimeDatabase & {
    withCompanyContext<T>(companyId: string, callback: (tx: unknown) => Promise<T>): Promise<T>;
  };

  constructor(
    @inject(AuthProvider) authProvider: AuthProvider,
    @inject(AppRuntimeDatabase) database: AuthRuntimeDatabase & {
      withCompanyContext<T>(companyId: string, callback: (tx: unknown) => Promise<T>): Promise<T>;
    },
  ) {
    this.authProvider = authProvider;
    this.database = database;
  }

  async resolve(request: FastifyRequest): Promise<GraphqlRequestContext> {
    const token = AuthProviderFactory.extractBearerToken(request.headers.authorization);
    const headers = request.headers as Record<string, unknown>;
    const hasDevAuthHeaders = this.authProvider.name === "dev" && DevAuthHeaders.hasAny(headers);
    if (!token && !hasDevAuthHeaders) {
      return {
        authSession: null,
        app_runtime_transaction_provider: null,
        resolveSubscriptionContext: null,
      };
    }

    const authSession = await this.authProvider.authenticateBearerToken(
      this.database,
      token ?? "",
      headers,
    );

    return {
      authSession,
      app_runtime_transaction_provider: authSession.company
        ? new AppRuntimeTransactionProvider(this.database as {
          withCompanyContext<T>(companyId: string, callback: (tx: unknown) => Promise<T>): Promise<T>;
        }, authSession.company.id)
        : null,
      redisCompanyScopedService: null,
      resolveSubscriptionContext: null,
    };
  }
}
