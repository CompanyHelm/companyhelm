import { injectable } from "inversify";

export enum ModelProviderAuthorizationType {
  ApiKey = "api_key",
  Oauth = "oauth",
}

export type ModelProviderDefinition = {
  authorizationInstructionsMarkdown: string | null;
  id: string;
  name: string;
  type: ModelProviderAuthorizationType;
};

/**
 * Defines the product-facing catalog of supported model providers. Its scope is exposing stable
 * provider metadata such as display names, authorization modes, and setup instructions so the API
 * and UI can drive provider onboarding without duplicating that policy in multiple layers.
 */
@injectable()
export class ModelProviderService {
  private readonly providers = new Map<string, ModelProviderDefinition>([
    [
      "openai",
      {
        id: "openai",
        name: "OpenAI API Key",
        type: ModelProviderAuthorizationType.ApiKey,
        authorizationInstructionsMarkdown:
          "Create an API key in the [OpenAI Platform](https://platform.openai.com/api-keys).",
      },
    ],
    [
      "anthropic",
      {
        id: "anthropic",
        name: "Anthropic",
        type: ModelProviderAuthorizationType.ApiKey,
        authorizationInstructionsMarkdown:
          "Create an API key in the [Anthropic Platform](https://platform.claude.com/settings/keys).",
      },
    ],
    [
      "openai-codex",
      {
        id: "openai-codex",
        name: "OpenAI Codex OAuth",
        type: ModelProviderAuthorizationType.Oauth,
        authorizationInstructionsMarkdown: [
          "run this command",
          "```",
          "npx @mariozechner/pi-ai login openai-codex && cat auth.json | pbcopy",
          "```",
          "Paste the full auth JSON file below.",
        ].join("\n"),
      },
    ],
  ]);

  get(providerId: string): ModelProviderDefinition {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Unsupported model provider: ${providerId}`);
    }

    return provider;
  }

  list(): ModelProviderDefinition[] {
    return Array.from(this.providers.values());
  }
}
