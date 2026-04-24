import { inject, injectable } from "inversify";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import { AuthProvider, type AuthenticateBearerTokenHeaders, type AuthSession } from "../auth_provider.ts";
import { DevAuthService } from "./dev_auth_service.ts";

/**
 * Adapts the passwordless dev auth workflow onto the generic auth-provider contract consumed by
 * the GraphQL request context resolver.
 */
@injectable()
export class DevAuthProvider extends AuthProvider {
  readonly name = "dev" as const;
  private readonly devAuthService: DevAuthService;

  constructor(@inject(DevAuthService) devAuthService: DevAuthService) {
    super();
    this.devAuthService = devAuthService;
  }

  async authenticateBearerToken(
    database: AppRuntimeDatabase,
    token: string,
    headers: AuthenticateBearerTokenHeaders = {},
  ): Promise<AuthSession> {
    void database;
    void token;
    return this.devAuthService.authenticateHeaders(headers);
  }
}
