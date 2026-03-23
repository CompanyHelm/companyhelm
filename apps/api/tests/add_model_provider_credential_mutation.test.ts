import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { ConfigDocument } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { SignInMutation } from "../src/graphql/mutations/sign_in.ts";
import { SignUpMutation } from "../src/graphql/mutations/sign_up.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";

class AddModelProviderCredentialMutationTestHarness {
  static createConfigMock(): ConfigDocument {
    return {
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      auth: {
        provider: "companyhelm",
      },
    } as ConfigDocument;
  }

  static createDatabaseMock() {
    const insertedValues: Array<Record<string, unknown>> = [];

    return {
      insertedValues,
      getDatabase() {
        return {
          insert() {
            return {
              values(value: Record<string, unknown>) {
                insertedValues.push(value);
                return {
                  async returning() {
                    return [{
                      id: "credential-1",
                      companyId: String(value.companyId),
                      name: String(value.name),
                      modelProvider: value.modelProvider,
                      type: value.type,
                      refreshToken: value.refreshToken ?? null,
                      refreshedAt: value.refreshedAt ?? null,
                      createdAt: value.createdAt,
                      updatedAt: value.updatedAt,
                    }];
                  },
                };
              },
            };
          },
        } as never;
      },
    };
  }
}

test("GraphQL AddModelProviderCredential mutation uses the x-company-id header", async () => {
  const app = Fastify();
  const config = AddModelProviderCredentialMutationTestHarness.createConfigMock();
  const database = AddModelProviderCredentialMutationTestHarness.createDatabaseMock();

  await new GraphqlApplication(
    config,
    new AddModelProviderCredentialMutation(database),
    new SignInMutation({ signIn() { throw new Error("unused"); } } as never, database),
    new SignUpMutation({ signUp() { throw new Error("unused"); } } as never, database),
    new HealthQueryResolver(),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      "x-company-id": "company-123",
    },
    payload: {
      query: `
        mutation AddModelProviderCredential($input: AddModelProviderCredentialInput!) {
          AddModelProviderCredential(input: $input) {
            id
            companyId
            name
            modelProvider
            type
            refreshToken
          }
        }
      `,
      variables: {
        input: {
          name: "Primary OpenAI key",
          modelProvider: "openai",
          type: "api_key",
          apiKey: "secret-value",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.AddModelProviderCredential, {
    id: "credential-1",
    companyId: "company-123",
    name: "Primary OpenAI key",
    modelProvider: "openai",
    type: "api_key",
    refreshToken: null,
  });
  assert.equal(database.insertedValues.length, 1);
  assert.equal(database.insertedValues[0]?.companyId, "company-123");
  assert.equal(database.insertedValues[0]?.encryptedApiKey, "secret-value");

  await app.close();
});
