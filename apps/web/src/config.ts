import packageDocument from "../../../package.json";

type RuntimeConfigDocument = Partial<ConfigDocument>;

/**
 * Resolves the browser runtime configuration from an injected window document first and falls
 * back to Vite environment variables for local development.
 */
export type ConfigDocument = {
  authProvider: "dev" | "local";
  appVersion: string;
  graphqlUrl: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
};

declare global {
  interface Window {
    __COMPANYHELM_CONFIG__?: RuntimeConfigDocument;
  }
}

export class Config {
  static getDocument(): ConfigDocument {
    const importMetaEnv = import.meta.env;
    const runtimeDocument = Config.getRuntimeDocument();

    return {
      authProvider: Config.resolveAuthProvider(
        runtimeDocument.authProvider,
        importMetaEnv?.VITE_AUTH_PROVIDER,
      ),
      appVersion: Config.resolveAppVersion(),
      graphqlUrl: Config.resolveRuntimeRequiredStringValue(
        runtimeDocument.graphqlUrl,
        importMetaEnv?.VITE_GRAPHQL_URL,
        "http://localhost:4000/graphql",
      ),
      privacyPolicyUrl: Config.resolveRuntimeRequiredStringValue(
        runtimeDocument.privacyPolicyUrl,
        importMetaEnv?.VITE_PRIVACY_POLICY_URL,
        "",
      ),
      termsOfServiceUrl: Config.resolveRuntimeRequiredStringValue(
        runtimeDocument.termsOfServiceUrl,
        importMetaEnv?.VITE_TERMS_OF_SERVICE_URL,
        "",
      ),
    };
  }

  private static resolveAppVersion(): string {
    const packageVersion = packageDocument.version;
    if (typeof packageVersion !== "string" || packageVersion.length === 0) {
      throw new Error("package.json is missing a version.");
    }

    return packageVersion;
  }

  private static resolveRuntimeRequiredStringValue(
    runtimeValue: unknown,
    fallbackSourceValue: unknown,
    fallbackValue: string,
  ): string {
    if (typeof runtimeValue === "string" && runtimeValue.trim().length > 0) {
      return runtimeValue.trim();
    }

    return Config.resolveRequiredStringValue(fallbackSourceValue, fallbackValue);
  }

  private static resolveAuthProvider(
    runtimeValue: unknown,
    fallbackSourceValue: unknown,
  ): "dev" | "local" {
    const resolvedValue = Config.resolveRequiredStringValue(fallbackSourceValue, "local");
    const provider = typeof runtimeValue === "string" && runtimeValue.trim().length > 0
      ? runtimeValue.trim()
      : resolvedValue;
    if (provider === "dev") {
      return "dev";
    }

    return "local";
  }

  private static getRuntimeDocument(): RuntimeConfigDocument {
    if (typeof window === "undefined") {
      return {};
    }

    return window.__COMPANYHELM_CONFIG__ ?? {};
  }

  private static resolveRequiredStringValue(value: unknown, fallbackValue: string): string {
    const normalizedValue = String(value || "").trim();
    return normalizedValue || fallbackValue;
  }

}

export const config: ConfigDocument = Config.getDocument();
