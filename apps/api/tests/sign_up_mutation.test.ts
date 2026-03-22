import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import Fastify from "fastify";
import { AuthProviderFactory } from "../src/auth/providers/auth_provider_factory.ts";
import type { ConfigDocument } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { SignUpMutation } from "../src/graphql/mutations/sign_up.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

/**
 * Builds a tiny GraphQL runtime harness without touching a real database connection.
 */
class SignUpMutationTestHarness {
  static createConfigMock(): ConfigDocument {
    return {
      graphql: {
        endpoint: "/graphql",
        graphiql: false,
      },
      auth: {
        provider: "companyhelm",
        companyhelm: {
          jwt_private_key_pem: privateKey,
          jwt_public_key_pem: publicKey,
          jwt_issuer: "companyhelm.local",
          jwt_audience: "companyhelm-web",
          jwt_expiration_seconds: 3600,
        },
      },
    } as ConfigDocument;
  }

  static createDatabaseMock() {
    const insertedValues: Array<Record<string, unknown>> = [];
    const transaction = {
      select() {
        return {
          from() {
            return {
              where() {
                return {
                  limit: async () => [],
                };
              },
            };
          },
        };
      },
      insert() {
        return {
          values(value: Record<string, unknown>) {
            insertedValues.push(value);
            return {
              async returning() {
                return [{
                  id: "user-graphql-1",
                  email: "new@example.com",
                  first_name: "New",
                  last_name: null,
                }];
              },
            };
          },
        };
      },
    };

    return {
      insertedValues,
      database: {
        async transaction<T>(callback: (database: typeof transaction) => Promise<T>) {
          return callback(transaction);
        },
      },
    };
  }
}

test("GraphQL SignUp mutation creates a session when lastName is omitted", async () => {
  const app = Fastify();
  const config = SignUpMutationTestHarness.createConfigMock();
  const databaseFixture = SignUpMutationTestHarness.createDatabaseMock();
  const signUpMutation = new SignUpMutation(
    AuthProviderFactory.createAuthProvider(config),
    {
      getDatabase() {
        return databaseFixture.database as never;
      },
    },
  );
  await new GraphqlApplication(
    config,
    signUpMutation,
    new HealthQueryResolver(),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    payload: {
      query: `
        mutation SignUp($input: SignUpInput!) {
          SignUp(input: $input) {
            token
            user {
              id
              email
              firstName
              lastName
              provider
              providerSubject
            }
          }
        }
      `,
      variables: {
        input: {
          email: "new@example.com",
          firstName: "New",
          password: "Passw0rd!",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(typeof document.data.SignUp.token, "string");
  assert.deepEqual(document.data.SignUp.user, {
    id: "user-graphql-1",
    email: "new@example.com",
    firstName: "New",
    lastName: null,
    provider: "companyhelm",
    providerSubject: "user-graphql-1",
  });
  assert.equal(databaseFixture.insertedValues.length, 2);
  assert.equal(databaseFixture.insertedValues[0]?.last_name, null);

  await app.close();
});
