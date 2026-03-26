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
 * Centralizes provider-specific authorization metadata so GraphQL and UI flows can resolve
 * the expected credential type and any provider-specific setup instructions from one place.
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
