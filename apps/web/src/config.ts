/**
 * Resolves the browser runtime configuration from Vite environment variables.
 */
export type AuthProviderDocument = "clerk" | "companyhelm";

export class Config {
  static getDocument() {
    return {
      authProvider: Config.resolveAuthProvider(import.meta.env.VITE_AUTH_PROVIDER),
      graphqlUrl: Config.resolveStringValue(
        import.meta.env.VITE_GRAPHQL_URL,
        Config.getDefaultGraphqlUrl(),
      ),
      tokenStorageKey: Config.resolveStringValue(
        import.meta.env.VITE_AUTH_TOKEN_STORAGE_KEY,
        "companyhelm.ng.auth.token",
      ),
      userStorageKey: Config.resolveStringValue(
        import.meta.env.VITE_AUTH_USER_STORAGE_KEY,
        "companyhelm.ng.auth.user",
      ),
      clerkPublishableKey: Config.resolveStringValue(
        import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
        "",
      ),
    };
  }

  private static getDefaultGraphqlUrl(): string {
    return import.meta.env.DEV ? "http://127.0.0.1:4000/graphql" : "/graphql";
  }

  private static resolveStringValue(value: unknown, fallbackValue: string): string {
    const normalizedValue = String(value || "").trim();
    return normalizedValue || fallbackValue;
  }

  private static resolveAuthProvider(value: unknown): AuthProviderDocument {
    const normalizedValue = String(value || "").trim().toLowerCase();
    return normalizedValue === "clerk" ? "clerk" : "companyhelm";
  }
}

export type ConfigDocument = ReturnType<typeof Config.getDocument>;

export const config: ConfigDocument = Config.getDocument();
