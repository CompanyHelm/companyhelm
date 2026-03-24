import "reflect-metadata";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { DeleteModelProviderCredentialMutation } from "../src/graphql/mutations/delete_model_provider_credential.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "../src/graphql/resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";
import type { ModelProviderModel } from "../src/model_manager.ts";

class DeleteModelProviderCredentialMutationTestHarness {
  static createConfigMock(): Config {
    return {
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      auth: {
        provider: "clerk",
      },
    } as Config;
  }

  static createDatabaseMock() {
    const deletedRows: Array<Record<string, unknown>> = [];

    return {
      deletedRows,
      getDatabase() {
        return {
          delete() {
            return {
              where() {
                return {
                  async returning() {
                    const deleted = {
                      id: "credential-1",
                      companyId: "company-123",
                      name: "OpenAI / Codex",
                      modelProvider: "openai",
                      type: "api_key",
                      refreshToken: null,
                      refreshedAt: null,
                      createdAt: new Date("2026-03-20T10:00:00.000Z"),
                      updatedAt: new Date("2026-03-20T10:00:00.000Z"),
                    };
                    deletedRows.push(deleted);
                    return [deleted];
                  },
                };
              },
            };
          },
        } as never;
      },
      async withCompanyContext(_companyId: string, callback: (database: unknown) => Promise<unknown>) {
        return callback(this.getDatabase());
      },
    };
  }
}

test("GraphQL DeleteModelProviderCredential mutation deletes a credential", async () => {
  const app = Fastify();
  const config = DeleteModelProviderCredentialMutationTestHarness.createConfigMock();
  const database = DeleteModelProviderCredentialMutationTestHarness.createDatabaseMock();
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

  await new GraphqlApplication(
    config,
    new AddModelProviderCredentialMutation(modelManager as never),
    new DeleteModelProviderCredentialMutation(),
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
        mutation DeleteModelProviderCredential($input: DeleteModelProviderCredentialInput!) {
          DeleteModelProviderCredential(input: $input) {
            id
            companyId
            name
          }
        }
      `,
      variables: {
        input: {
          id: "credential-1",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.DeleteModelProviderCredential, {
    id: "credential-1",
    companyId: "company-123",
    name: "OpenAI / Codex",
  });
  assert.equal(database.deletedRows.length, 1);

  await app.close();
});
