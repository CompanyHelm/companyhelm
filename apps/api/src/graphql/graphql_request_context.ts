import type { FastifyRequest } from "fastify";
import { inject, injectable } from "inversify";
import { AuthProvider, type AuthSession } from "../auth/auth_provider.ts";
import { AuthProviderFactory } from "../auth/auth_provider_factory.ts";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";

export type GraphqlRequestContext = {
  authSession: AuthSession | null;
};

/**
 * Resolves GraphQL request auth from the bearer token so downstream mutations can trust session data.
 */
@injectable()
export class GraphqlRequestContextResolver {
  private readonly authProvider: AuthProvider;
  private readonly database: AppRuntimeDatabase;

  constructor(
    @inject(AuthProvider) authProvider: AuthProvider,
    @inject(AppRuntimeDatabase) database: AppRuntimeDatabase,
  ) {
    this.authProvider = authProvider;
    this.database = database;
  }

  async resolve(request: FastifyRequest): Promise<GraphqlRequestContext> {
    const token = AuthProviderFactory.extractBearerToken(request.headers.authorization);
    if (!token) {
      return {
        authSession: null,
      };
    }

    return {
      authSession: await this.authProvider.authenticateBearerToken(
        this.database.getDatabase(),
        token,
        request.headers as Record<string, unknown>,
      ),
    };
  }
}
