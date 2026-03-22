export interface RuntimeConfigDocument {
  graphqlUrl: string;
  tokenStorageKey: string;
  userStorageKey: string;
}

export class RuntimeConfig {
  static getDocument(): RuntimeConfigDocument {
    return {
      graphqlUrl: RuntimeConfig.resolveGraphqlUrl(),
      tokenStorageKey: RuntimeConfig.resolveStringValue(
        import.meta.env.VITE_AUTH_TOKEN_STORAGE_KEY,
        "companyhelm.ng.auth.token",
      ),
      userStorageKey: RuntimeConfig.resolveStringValue(
        import.meta.env.VITE_AUTH_USER_STORAGE_KEY,
        "companyhelm.ng.auth.user",
      ),
    };
  }

  private static resolveGraphqlUrl(): string {
    const configuredValue = RuntimeConfig.resolveStringValue(import.meta.env.VITE_GRAPHQL_URL, "");
    if (configuredValue) {
      return configuredValue;
    }

    if (typeof window === "undefined") {
      return "http://127.0.0.1:4000/graphql";
    }

    const protocol = window.location.protocol || "http:";
    const hostName = window.location.hostname || "127.0.0.1";
    return `${protocol}//${hostName}:4000/graphql`;
  }

  private static resolveStringValue(value: unknown, fallbackValue: string): string {
    const normalizedValue = String(value || "").trim();
    return normalizedValue || fallbackValue;
  }
}

export const runtimeConfig = RuntimeConfig.getDocument();
