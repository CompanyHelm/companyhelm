import packageDocument from "../../../package.json";

export type PaddleConfigDocument = {
  clientToken: string;
  environment: "sandbox" | "production";
};

type RuntimePaddleConfigDocument = Partial<PaddleConfigDocument>;

type RuntimeConfigDocument = Partial<Omit<ConfigDocument, "paddle">> & {
  paddle?: RuntimePaddleConfigDocument;
};

/**
 * Resolves the browser runtime configuration from an injected window document first and falls
 * back to Vite environment variables for local development.
 */
export type ConfigDocument = {
  authProvider: "clerk" | "dev" | "local";
  appVersion: string;
  clerkPublishableKey: string;
  graphqlUrl: string;
  paddle: PaddleConfigDocument;
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
      clerkPublishableKey: Config.resolveRuntimeRequiredStringValue(
        runtimeDocument.clerkPublishableKey,
        importMetaEnv?.VITE_CLERK_PUBLISHABLE_KEY,
        "",
      ),
      graphqlUrl: Config.resolveRuntimeRequiredStringValue(
        runtimeDocument.graphqlUrl,
        importMetaEnv?.VITE_GRAPHQL_URL,
        "http://localhost:4000/graphql",
      ),
      paddle: {
        clientToken: Config.resolveRuntimeRequiredStringValue(
          runtimeDocument.paddle?.clientToken,
          importMetaEnv?.VITE_PADDLE_CLIENT_TOKEN,
          "",
        ),
        environment: Config.resolvePaddleEnvironment(
          runtimeDocument.paddle?.environment,
          importMetaEnv?.VITE_PADDLE_ENVIRONMENT,
        ),
      },
      privacyPolicyUrl: Config.resolveRuntimeRequiredStringValue(
        runtimeDocument.privacyPolicyUrl,
        importMetaEnv?.VITE_CLERK_PRIVACY_POLICY_URL,
        "",
      ),
      termsOfServiceUrl: Config.resolveRuntimeRequiredStringValue(
        runtimeDocument.termsOfServiceUrl,
        importMetaEnv?.VITE_CLERK_TERMS_OF_SERVICE_URL,
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
  ): "clerk" | "dev" | "local" {
    const resolvedValue = Config.resolveRequiredStringValue(fallbackSourceValue, "clerk");
    const provider = typeof runtimeValue === "string" && runtimeValue.trim().length > 0
      ? runtimeValue.trim()
      : resolvedValue;
    if (provider === "dev") {
      return "dev";
    }

    return provider === "local" ? "local" : "clerk";
  }

  private static resolvePaddleEnvironment(
    runtimeValue: unknown,
    fallbackSourceValue: unknown,
  ): "sandbox" | "production" {
    const value = typeof runtimeValue === "string" && runtimeValue.trim().length > 0
      ? runtimeValue.trim()
      : Config.resolveRequiredStringValue(fallbackSourceValue, "sandbox");
    return value === "production" ? "production" : "sandbox";
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
