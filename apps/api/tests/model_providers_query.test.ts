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
      id: "openai",
      name: "OpenAI",
      type: "api_key",
      authorizationInstructionsMarkdown:
        "Create an API key in the [OpenAI API quickstart](https://platform.openai.com/docs/quickstart/step-2-set-up-your-api-key).",
    },
    {
      id: "anthropic",
      name: "Anthropic",
      type: "api_key",
      authorizationInstructionsMarkdown:
        "Create an API key in the [Anthropic API getting started guide](https://docs.anthropic.com/en/api/getting-started).",
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      type: "api_key",
      authorizationInstructionsMarkdown:
        "Create an API key in the [OpenRouter keys settings](https://openrouter.ai/settings/keys).",
    },
    {
      id: "openai-codex",
      name: "OpenAI Codex",
      type: "oauth",
      authorizationInstructionsMarkdown: [
        "run this command",
        "```",
        "npx @mariozechner/pi-ai login openai-codex && cat auth.json | pbcopy && rm auth.json and paste below",
        "```",
      ].join("\n"),
    },
  ]);

  await app.close();
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
