import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { DeleteModelProviderCredentialMutation } from "../src/graphql/mutations/delete_model_provider_credential.ts";
import { RefreshModelProviderCredentialModelsMutation } from "../src/graphql/mutations/refresh_model_provider_credential_models.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../src/graphql/resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import { ModelProvidersQueryResolver } from "../src/graphql/resolvers/model_providers.ts";
import type { ModelProviderModel } from "../src/services/ai_providers/model_service.js";

class ModelProvidersQueryTestHarness {
  static createConfigMock(): Config {
    return {
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      log: {
        json: false,
        level: "info",
      },
      auth: {
        provider: "clerk",
      },
    } as Config;
  }
}

test("GraphQL ModelProviders query lists provider setup metadata", async () => {
  const app = Fastify();
  const config = ModelProvidersQueryTestHarness.createConfigMock();
  const database = {
    async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
      return callback({} as never);
    },
  };
  const modelManager = {
    async fetchModels(): Promise<ModelProviderModel[]> {
      return [];
    },
  };
  const authProvider = {
    async authenticateBearerToken() {
      return {
        token: "jwt-token",
        user: {
          id: "user-123",
          email: "user@example.com",
          firstName: "User",
          lastName: "Example",
          provider: "clerk" as const,
          providerSubject: "user_clerk_123",
        },
        company: {
          id: "company-123",
          name: "Example Org",
        },
      };
    },
  };

  await GraphqlApplication.fromResolvers(
    config,
    new AddModelProviderCredentialMutation(modelManager as never),
    new DeleteModelProviderCredentialMutation(),
    new RefreshModelProviderCredentialModelsMutation(modelManager as never),
    new GraphqlRequestContextResolver(authProvider as never, database),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialModelsQueryResolver(),
    new ModelProviderCredentialsQueryResolver(),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        query ModelProviders {
          ModelProviders {
            id
            isAvailable
            name
            type
            authorizationInstructionsMarkdown
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.ModelProviders, [
    {
      id: "companyhelm",
      isAvailable: false,
      name: "CompanyHelm",
      type: "api_key",
      authorizationInstructionsMarkdown: "Included and managed by CompanyHelm.",
    },
    {
      id: "openai",
      isAvailable: true,
      name: "OpenAI",
      type: "api_key",
      authorizationInstructionsMarkdown:
        "Create an API key in the [OpenAI API quickstart](https://platform.openai.com/docs/quickstart/step-2-set-up-your-api-key).",
    },
    {
      id: "anthropic",
      isAvailable: true,
      name: "Anthropic",
      type: "api_key",
      authorizationInstructionsMarkdown:
        "Create an API key in the [Anthropic API getting started guide](https://docs.anthropic.com/en/api/getting-started).",
    },
    {
      id: "openrouter",
      isAvailable: true,
      name: "OpenRouter",
      type: "api_key",
      authorizationInstructionsMarkdown:
        "Create an API key in the [OpenRouter keys settings](https://openrouter.ai/settings/keys).",
    },
    {
      id: "openai-compatible",
      isAvailable: true,
      name: "OpenAI-compatible API",
      type: "api_key",
      authorizationInstructionsMarkdown:
        "Use an OpenAI-compatible `/v1` endpoint such as Ollama, vLLM, LM Studio, or a compatible proxy.",
    },
    {
      id: "openai-codex",
      isAvailable: true,
      name: "OpenAI Codex",
      type: "oauth",
      authorizationInstructionsMarkdown: [
        "Run this command. It copies the auth file to your clipboard; paste it into the Auth File field below.",
        "```",
        "npx @mariozechner/pi-ai login openai-codex && cat auth.json | pbcopy && rm auth.json",
        "```",
      ].join("\n"),
    },
    {
      id: "google-gemini-cli",
      isAvailable: true,
      name: "Google Gemini CLI",
      type: "oauth",
      authorizationInstructionsMarkdown: [
        "Run this command. It copies the auth file to your clipboard; paste it into the Auth File field below.",
        "```",
        "npx @mariozechner/pi-ai login google-gemini-cli && cat auth.json | pbcopy && rm auth.json",
        "```",
      ].join("\n"),
    },
  ]);

  await app.close();
});

test("ModelProviders resolver marks CompanyHelm available when the runtime key is configured", async () => {
  const resolver = new ModelProvidersQueryResolver(undefined, {
    hasRuntimeApiKey: () => true,
  });

  const providers = await resolver.execute({}, {}, {
    authSession: {
      company: {
        id: "company-123",
        name: "Example Org",
      },
    },
  } as never);

  const companyHelmProvider = providers.find((provider) => provider.id === "companyhelm");

  assert.equal(companyHelmProvider?.isAvailable, true);
});

test("GraphQL ModelProviders query rejects unauthenticated requests", async () => {
  const app = Fastify();
  const config = ModelProvidersQueryTestHarness.createConfigMock();
  const database = {
    async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
      return callback({} as never);
    },
  };
  const modelManager = {
    async fetchModels(): Promise<ModelProviderModel[]> {
      return [];
    },
  };
  const authProvider = {
    async authenticateBearerToken() {
      throw new Error("unused");
    },
  };

  await GraphqlApplication.fromResolvers(
    config,
    new AddModelProviderCredentialMutation(modelManager as never),
    new DeleteModelProviderCredentialMutation(),
    new RefreshModelProviderCredentialModelsMutation(modelManager as never),
    new GraphqlRequestContextResolver(authProvider as never, database),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialModelsQueryResolver(),
    new ModelProviderCredentialsQueryResolver(),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    payload: {
      query: `
        query ModelProviders {
          ModelProviders {
            id
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.data, null);
  assert.equal(document.errors?.[0]?.message, "Authentication required.");

  await app.close();
});
