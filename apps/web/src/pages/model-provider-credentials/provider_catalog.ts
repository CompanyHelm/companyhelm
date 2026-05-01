export type ModelProviderCredentialApiProvider = {
  authorizationInstructionsMarkdown: string | null;
  id: string;
  name: string;
  type: "api_key" | "oauth";
};

export type ModelProviderCredentialDialogProvider = ModelProviderCredentialApiProvider & {
  authorizationLabel: "API key" | "Subscription";
  baseUrl: string | null;
  defaultCredentialName: string | null;
  submittedProviderId: string;
};

/**
 * Adds web-only provider affordances on top of the API provider catalog. Some vendors expose an
 * OpenAI-compatible endpoint, so the browser can offer vendor-specific onboarding while still
 * submitting the API's stable openai-compatible provider id and base URL contract.
 */
export class ModelProviderCredentialCatalog {
  static readonly NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

  static readonly NVIDIA_PROVIDER_ID = "nvidia";

  private static readonly OPENAI_COMPATIBLE_PROVIDER_ID = "openai-compatible";

  private static readonly DIALOG_PROVIDER_ORDER = new Map([
    ["openai-codex", 0],
    ["anthropic", 1],
    ["openai", 2],
    ["google", 3],
    ["openrouter", 4],
    [ModelProviderCredentialCatalog.NVIDIA_PROVIDER_ID, 5],
    [ModelProviderCredentialCatalog.OPENAI_COMPATIBLE_PROVIDER_ID, 6],
  ]);

  static toDialogProviders(
    providers: ModelProviderCredentialApiProvider[],
  ): ModelProviderCredentialDialogProvider[] {
    const dialogProviders: ModelProviderCredentialDialogProvider[] = [];
    for (const provider of providers) {
      if (provider.id === ModelProviderCredentialCatalog.OPENAI_COMPATIBLE_PROVIDER_ID) {
        dialogProviders.push(ModelProviderCredentialCatalog.createNvidiaProvider());
      }

      dialogProviders.push(ModelProviderCredentialCatalog.createDialogProvider(provider));
    }

    return dialogProviders.sort((left, right) =>
      ModelProviderCredentialCatalog.dialogProviderOrder(left.id)
      - ModelProviderCredentialCatalog.dialogProviderOrder(right.id)
    );
  }

  static isNvidiaCredential(input: {
    baseUrl?: string | null;
    modelProvider: string;
  }): boolean {
    return input.modelProvider === ModelProviderCredentialCatalog.OPENAI_COMPATIBLE_PROVIDER_ID
      && input.baseUrl === ModelProviderCredentialCatalog.NVIDIA_BASE_URL;
  }

  static requiresBaseUrl(provider: ModelProviderCredentialDialogProvider): boolean {
    return provider.submittedProviderId === ModelProviderCredentialCatalog.OPENAI_COMPATIBLE_PROVIDER_ID;
  }

  static usesEditableBaseUrl(provider: ModelProviderCredentialDialogProvider): boolean {
    return ModelProviderCredentialCatalog.requiresBaseUrl(provider) && !provider.baseUrl;
  }

  static resolveBaseUrl(input: {
    baseUrl: string;
    provider: ModelProviderCredentialDialogProvider;
  }): string | null {
    if (!ModelProviderCredentialCatalog.requiresBaseUrl(input.provider)) {
      return null;
    }

    return input.provider.baseUrl ?? input.baseUrl;
  }

  static resolveCredentialName(input: {
    name: string;
    provider: ModelProviderCredentialDialogProvider;
  }): string {
    return input.name || input.provider.defaultCredentialName || input.name;
  }

  private static createDialogProvider(
    provider: ModelProviderCredentialApiProvider,
  ): ModelProviderCredentialDialogProvider {
    return {
      ...provider,
      authorizationLabel: provider.type === "oauth" ? "Subscription" : "API key",
      baseUrl: null,
      defaultCredentialName: null,
      name: ModelProviderCredentialCatalog.dialogProviderName(provider.id, provider.name),
      submittedProviderId: provider.id,
    };
  }

  private static dialogProviderName(providerId: string, fallbackName: string): string {
    if (providerId === "openai-codex") {
      return "Codex";
    }
    if (providerId === "google") {
      return "Google Gemini API";
    }
    if (providerId === "openai") {
      return "OpenAI";
    }
    if (providerId === "anthropic") {
      return "Anthropic";
    }
    if (providerId === "openrouter") {
      return "OpenRouter";
    }
    if (providerId === ModelProviderCredentialCatalog.OPENAI_COMPATIBLE_PROVIDER_ID) {
      return "OpenAI Compatible";
    }

    return fallbackName.replaceAll("-", " ");
  }

  private static dialogProviderOrder(providerId: string): number {
    return ModelProviderCredentialCatalog.DIALOG_PROVIDER_ORDER.get(providerId) ?? Number.MAX_SAFE_INTEGER;
  }

  private static createNvidiaProvider(): ModelProviderCredentialDialogProvider {
    return {
      authorizationLabel: "API key",
      authorizationInstructionsMarkdown:
        "Create an API key in the [NVIDIA API keys settings](https://build.nvidia.com/settings/api-keys).",
      baseUrl: ModelProviderCredentialCatalog.NVIDIA_BASE_URL,
      defaultCredentialName: "NVIDIA",
      id: ModelProviderCredentialCatalog.NVIDIA_PROVIDER_ID,
      name: "NVIDIA",
      submittedProviderId: ModelProviderCredentialCatalog.OPENAI_COMPATIBLE_PROVIDER_ID,
      type: "api_key",
    };
  }
}
