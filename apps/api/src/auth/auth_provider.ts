import type { DatabaseClientInterface } from "../db/database_interface.ts";

export type AuthRuntimeDatabase = {
  getDatabase?(): DatabaseClientInterface;
  applyCompanyContext?(database: DatabaseClientInterface, companyId: string): Promise<void>;
  withCompanyContext?<T>(companyId: string, callback: (database: unknown) => Promise<T>): Promise<T>;
};

export type AuthProviderName = "clerk" | "dev" | "local";

export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  provider: AuthProviderName;
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
  abstract readonly name: AuthProviderName;
  abstract authenticateBearerToken(
    database: AuthRuntimeDatabase,
    token: string,
    headers: AuthenticateBearerTokenHeaders,
  ): Promise<AuthSession>;
}
