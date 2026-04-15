import packageDocument from "../../../package.json";

export type AmplitudeConfigDocument = {
  enabled: boolean;
  id?: string;
};

export type AnalyticsConfigDocument = {
  amplitude: AmplitudeConfigDocument;
};

type RuntimeAmplitudeConfigDocument = Partial<AmplitudeConfigDocument>;

type RuntimeConfigDocument = Partial<Omit<ConfigDocument, "analytics">> & {
  analytics?: {
    amplitude?: RuntimeAmplitudeConfigDocument;
  };
};

/**
 * Resolves the browser runtime configuration from an injected window document first and falls
 * back to Vite environment variables for local development.
 */
export type ConfigDocument = {
  appVersion: string;
  clerkPublishableKey: string;
  graphqlUrl: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  analytics: AnalyticsConfigDocument;
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
      analytics: {
        amplitude: {
          enabled: Config.resolveRuntimeBooleanValue(
            runtimeDocument.analytics?.amplitude?.enabled,
            importMetaEnv?.VITE_AMPLITUDE_ENABLED,
            false,
          ),
          id: Config.resolveRuntimeOptionalStringValue(
            runtimeDocument.analytics?.amplitude?.id,
            importMetaEnv?.VITE_AMPLITUDE_ID,
          ),
        },
      },
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

  private static resolveRuntimeOptionalStringValue(
    runtimeValue: unknown,
    fallbackSourceValue: unknown,
  ): string | undefined {
    if (typeof runtimeValue === "string" && runtimeValue.trim().length > 0) {
      return runtimeValue.trim();
    }

    return Config.resolveOptionalStringValue(fallbackSourceValue);
  }

  private static resolveRuntimeBooleanValue(
    runtimeValue: unknown,
    fallbackSourceValue: unknown,
    fallbackValue: boolean,
  ): boolean {
    if (typeof runtimeValue === "boolean") {
      return runtimeValue;
    }

    return Config.resolveBooleanValue(fallbackSourceValue, fallbackValue);
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

  private static resolveOptionalStringValue(value: unknown): string | undefined {
    const normalizedValue = String(value || "").trim();
    return normalizedValue || undefined;
  }

  private static resolveBooleanValue(value: unknown, fallbackValue: boolean): boolean {
    if (typeof value === "boolean") {
      return value;
    }

    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }

    return fallbackValue;
  }
}

export const config: ConfigDocument = Config.getDocument();
