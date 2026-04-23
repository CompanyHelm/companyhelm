import { inject, injectable } from "inversify";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import { AuthProvider, type AuthenticateBearerTokenHeaders, type AuthSession } from "../auth_provider.ts";
import { LocalAuthService } from "./local_auth_service.ts";

/**
 * Adapts the local auth session service onto the generic auth-provider contract consumed by the
 * GraphQL request context resolver.
 */
@injectable()
export class LocalAuthProvider extends AuthProvider {
  readonly name = "local" as const;
  private readonly localAuthService: LocalAuthService;

  constructor(@inject(LocalAuthService) localAuthService: LocalAuthService) {
    super();
    this.localAuthService = localAuthService;
  }

  async authenticateBearerToken(
    database: AppRuntimeDatabase,
    token: string,
    headers: AuthenticateBearerTokenHeaders = {},
  ): Promise<AuthSession> {
    void database;
    void headers;
    return this.localAuthService.authenticateBearerToken(token);
  }
}
