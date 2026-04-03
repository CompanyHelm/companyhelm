/**
 * Resolves the browser runtime configuration from an injected window document first and falls
 * back to Vite environment variables for local development.
 */
export type ConfigDocument = {
  clerkPublishableKey: string;
  graphqlUrl: string;
};

declare global {
  interface Window {
    __COMPANYHELM_CONFIG__?: Partial<ConfigDocument>;
  }
}

export class Config {
  static getDocument(): ConfigDocument {
    return {
      clerkPublishableKey: Config.resolveRuntimeStringValue(
        "clerkPublishableKey",
        import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
        "",
      ),
      graphqlUrl: Config.resolveRuntimeStringValue(
        "graphqlUrl",
        import.meta.env.VITE_GRAPHQL_URL,
        "http://localhost:4000/graphql",
      ),
    };
  }

  private static resolveRuntimeStringValue(
    key: keyof ConfigDocument,
    fallbackSourceValue: unknown,
    fallbackValue: string,
  ): string {
    const runtimeDocument = Config.getRuntimeDocument();
    const runtimeValue = runtimeDocument[key];
    if (typeof runtimeValue === "string" && runtimeValue.trim().length > 0) {
      return runtimeValue.trim();
    }

    return Config.resolveStringValue(fallbackSourceValue, fallbackValue);
  }

  private static getRuntimeDocument(): Partial<ConfigDocument> {
    if (typeof window === "undefined") {
      return {};
    }

    return window.__COMPANYHELM_CONFIG__ ?? {};
  }

  private static resolveStringValue(value: unknown, fallbackValue: string): string {
    const normalizedValue = String(value || "").trim();
    return normalizedValue || fallbackValue;
  }
}

export const config: ConfigDocument = Config.getDocument();
