/**
 * Resolves the browser runtime configuration from Vite environment variables.
 */
export class Config {
  static getDocument() {
    return {
      graphqlUrl: Config.resolveStringValue(import.meta.env.VITE_GRAPHQL_URL, "/graphql"),
      tokenStorageKey: Config.resolveStringValue(
        import.meta.env.VITE_AUTH_TOKEN_STORAGE_KEY,
        "companyhelm.ng.auth.token",
      ),
      userStorageKey: Config.resolveStringValue(
        import.meta.env.VITE_AUTH_USER_STORAGE_KEY,
        "companyhelm.ng.auth.user",
      ),
    };
  }

  private static resolveStringValue(value: unknown, fallbackValue: string): string {
    const normalizedValue = String(value || "").trim();
    return normalizedValue || fallbackValue;
  }
}

export type ConfigDocument = ReturnType<typeof Config.getDocument>;

export const config: ConfigDocument = Config.getDocument();
