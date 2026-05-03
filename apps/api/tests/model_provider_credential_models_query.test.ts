import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { modelProviderCredentialModels, modelProviderCredentials } from "../src/db/schema.ts";
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

class ModelProviderCredentialModelsQueryTestHarness {
  static createConfigMock(): Config {
    return {
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      auth: {
        provider: "local",
      },
      log: {
        json: false,
        level: "info",
      },
    } as Config;
  }

  static createDatabaseMock(params?: {
    credential?: {
      id: string;
      isManaged: boolean;
      modelProvider: string;
    };
    rows?: Array<{
      id: string;
      isDefault: boolean;
      modelProviderCredentialId: string;
      modelId: string;
      name: string;
      description: string;
      reasoningSupported: boolean;
      reasoningLevels: string[];
    }>;
  }) {
    const credential = params?.credential ?? {
      id: "credential-1",
      isManaged: false,
      modelProvider: "openai",
    };
    const rows = params?.rows ?? [{
      id: "model-1",
      isDefault: true,
      modelProviderCredentialId: "credential-1",
      modelId: "gpt-5.4",
      name: "GPT-5.4",
      description: "Latest frontier agentic coding model.",
      reasoningSupported: true,
      reasoningLevels: ["low", "medium"],
    }];
    const scopedCompanyIds: string[] = [];

    return {
      scopedCompanyIds,
      getDatabase() {
        return {
          select() {
            return {
              from(table: unknown) {
                return {
                  async where() {
                    if (table === modelProviderCredentials) {
                      return [credential];
                    }
                    if (table === modelProviderCredentialModels) {
                      return rows;
                    }
                    return rows;
                  },
                };
              },
            };
          },
        } as never;
      },
      async withCompanyContext(companyId: string, callback: (database: unknown) => Promise<unknown>) {
        scopedCompanyIds.push(companyId);
        return callback(this.getDatabase());
      },
    };
  }
}

test("GraphQL ModelProviderCredentialModels query lists models for the credential", async () => {
  const app = Fastify();
  const config = ModelProviderCredentialModelsQueryTestHarness.createConfigMock();
  const database = ModelProviderCredentialModelsQueryTestHarness.createDatabaseMock();
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
          provider: "local" as const,
          providerSubject: "user_local_123",
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
        query CredentialModels($credentialId: ID!) {
          ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) {
            id
            isDefault
            modelProviderCredentialId
            modelId
            name
            description
            reasoningSupported
            reasoningLevels
          }
        }
      `,
      variables: {
        credentialId: "credential-1",
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.ModelProviderCredentialModels, [{
    id: "model-1",
    isDefault: true,
    modelProviderCredentialId: "credential-1",
    modelId: "gpt-5.4",
    name: "GPT-5.4",
    description: "Latest frontier agentic coding model.",
    reasoningSupported: true,
    reasoningLevels: ["low", "medium"],
  }]);
  assert.deepEqual(database.scopedCompanyIds, ["company-123"]);

  await app.close();
});

test("GraphQL ModelProviderCredentialModels query rejects unauthenticated requests", async () => {
  const app = Fastify();
  const config = ModelProviderCredentialModelsQueryTestHarness.createConfigMock();
  const database = ModelProviderCredentialModelsQueryTestHarness.createDatabaseMock();
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
        query CredentialModels($credentialId: ID!) {
          ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) {
            id
          }
        }
      `,
      variables: {
        credentialId: "credential-1",
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(document.data, null);
  assert.equal(document.errors?.[0]?.message, "Authentication required.");

  await app.close();
});