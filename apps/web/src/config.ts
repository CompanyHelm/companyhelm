/**
 * Resolves the browser runtime configuration from Vite environment variables.
 */
export class Config {
  static getDocument() {
    return {
      clerkPublishableKey: Config.resolveStringValue(
        import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
        "",
      ),
      graphqlUrl: Config.resolveStringValue(
        import.meta.env.VITE_GRAPHQL_URL,
        "http://localhost:4000/graphql",
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
