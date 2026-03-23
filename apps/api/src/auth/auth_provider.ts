export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  provider: "companyhelm" | "clerk";
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

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = {
  email: string;
  firstName: string;
  lastName?: string | null;
  password: string;
};

export type AuthProviderDatabaseTransaction = {
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
};

export type AuthProviderDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<unknown[]>;
      };
    };
  };
  transaction?<T>(callback: (transaction: AuthProviderDatabaseTransaction) => Promise<T>): Promise<T>;
};

/**
 * Defines the minimal shared auth-provider surface and serves as the runtime DI token for the
 * configured provider singleton.
 */
export abstract class AuthProvider {
  abstract readonly name: "companyhelm" | "clerk";
  abstract authenticateBearerToken(
    db: AuthProviderDatabase,
    token: string,
  ): Promise<AuthSession>;
  abstract signUp(db: AuthProviderDatabase, input: SignUpInput): Promise<AuthSession>;
  abstract signIn(db: AuthProviderDatabase, input: SignInInput): Promise<AuthSession>;
}
