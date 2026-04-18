export type ModelProviderCredentialApiProvider = {
  authorizationInstructionsMarkdown: string | null;
  id: string;
  name: string;
  type: "api_key" | "oauth";
};

export type ModelProviderCredentialDialogProvider = ModelProviderCredentialApiProvider & {
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

  static toDialogProviders(
    providers: ModelProviderCredentialApiProvider[],
  ): ModelProviderCredentialDialogProvider[] {
    const dialogProviders: ModelProviderCredentialDialogProvider[] = [];
    for (const provider of providers) {
      dialogProviders.push({
        ...provider,
        baseUrl: null,
        defaultCredentialName: null,
        submittedProviderId: provider.id,
      });

      if (provider.id === ModelProviderCredentialCatalog.OPENAI_COMPATIBLE_PROVIDER_ID) {
        dialogProviders.push(ModelProviderCredentialCatalog.createNvidiaProvider());
      }
    }

    return dialogProviders;
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

  private static createNvidiaProvider(): ModelProviderCredentialDialogProvider {
    return {
      authorizationInstructionsMarkdown: [
        "Create an API key in the [NVIDIA API keys settings](https://build.nvidia.com/settings/api-keys).",
        `This uses NVIDIA's OpenAI-compatible endpoint: \`${ModelProviderCredentialCatalog.NVIDIA_BASE_URL}\`.`,
      ].join("\n\n"),
      baseUrl: ModelProviderCredentialCatalog.NVIDIA_BASE_URL,
      defaultCredentialName: "NVIDIA",
      id: ModelProviderCredentialCatalog.NVIDIA_PROVIDER_ID,
      name: "NVIDIA (API key)",
      submittedProviderId: ModelProviderCredentialCatalog.OPENAI_COMPATIBLE_PROVIDER_ID,
      type: "api_key",
    };
  }
}
