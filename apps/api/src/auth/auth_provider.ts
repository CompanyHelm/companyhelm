import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";

export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  provider: "clerk";
  providerSubject: string;
};

export type AuthenticatedCompany = {
  id: string;
  name: string;
};

export type AuthSession = {
  token: string;
  user: AuthenticatedUser;
  company: AuthenticatedCompany | null;
};

export type AuthenticateBearerTokenHeaders = Record<string, unknown>;

/**
 * Defines the minimal shared auth-provider surface and serves as the runtime DI token for the
 * configured provider singleton.
 */
export abstract class AuthProvider {
  abstract readonly name: "clerk";
  abstract authenticateBearerToken(
    database: AppRuntimeDatabase,
    token: string,
    headers: AuthenticateBearerTokenHeaders,
  ): Promise<AuthSession>;
}
