export type AuthenticatedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  provider: "companyhelm" | "supabase";
  providerSubject: string;
};

export type AuthSession = {
  token: string;
  user: AuthenticatedUser;
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
 * Defines the documented auth-provider surface shared by the concrete provider implementations.
 */
export abstract class AuthProvider {
  abstract readonly name: "companyhelm" | "supabase";

  abstract authenticateBearerToken(db: AuthProviderDatabase, token: string): Promise<AuthenticatedUser>;

  signUp?(_db: AuthProviderDatabase, _input: SignUpInput): Promise<AuthSession>;

  signIn?(_db: AuthProviderDatabase, _input: SignInInput): Promise<AuthSession>;
}
