import { injectable } from "inversify";

export type ModelProviderId = "anthropic" | "google-gemini-cli" | "openai" | "openai-codex" | "openrouter";

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
        name: "OpenAI",
        type: ModelProviderAuthorizationType.ApiKey,
        authorizationInstructionsMarkdown:
          "Create an API key in the [OpenAI API quickstart](https://platform.openai.com/docs/quickstart/step-2-set-up-your-api-key).",
      },
    ],
    [
      "anthropic",
      {
        id: "anthropic",
        name: "Anthropic",
        type: ModelProviderAuthorizationType.ApiKey,
        authorizationInstructionsMarkdown:
          "Create an API key in the [Anthropic API getting started guide](https://docs.anthropic.com/en/api/getting-started).",
      },
    ],
    [
      "openrouter",
      {
        id: "openrouter",
        name: "OpenRouter",
        type: ModelProviderAuthorizationType.ApiKey,
        authorizationInstructionsMarkdown:
          "Create an API key in the [OpenRouter keys settings](https://openrouter.ai/settings/keys).",
      },
    ],
    [
      "openai-codex",
      {
        id: "openai-codex",
        name: "OpenAI Codex",
        type: ModelProviderAuthorizationType.Oauth,
        authorizationInstructionsMarkdown: [
          "run this command",
          "```",
          "npx @mariozechner/pi-ai login openai-codex && cat auth.json | pbcopy && rm auth.json and paste below",
          "```",
        ].join("\n"),
      },
    ],
    [
      "google-gemini-cli",
      {
        id: "google-gemini-cli",
        name: "Google Gemini CLI",
        type: ModelProviderAuthorizationType.Oauth,
        authorizationInstructionsMarkdown: [
          "run this command",
          "```",
          "npx @mariozechner/pi-ai login google-gemini-cli && cat auth.json | pbcopy && rm auth.json and paste below",
          "```",
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
