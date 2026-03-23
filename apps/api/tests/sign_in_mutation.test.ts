import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import Fastify from "fastify";
import { test } from "vitest";
import { AuthProviderFactory } from "../src/auth/auth_provider_factory.ts";
import { PasswordService } from "../src/auth/companyhelm/password_service.ts";
import type { ConfigDocument } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { SignInMutation } from "../src/graphql/mutations/sign_in.ts";
import { SignUpMutation } from "../src/graphql/mutations/sign_up.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";
import { ModelProviderCredentialsQueryResolver } from "../src/graphql/resolvers/model_provider_credentials.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

/**
 * Builds a tiny GraphQL runtime harness for the sign-in mutation.
 */
class SignInMutationTestHarness {
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
    const storedPassword = PasswordService.createPasswordHash("abc123!");
    let selectCallCount = 0;

    return {
      select() {
        selectCallCount += 1;
        if (selectCallCount === 1) {
          return {
            from() {
              return {
                where() {
                  return {
                    limit: async () => [{
                      id: "user-graphql-1",
                      email: "user@example.com",
                      first_name: "User",
                      last_name: "One",
                    }],
                  };
                },
              };
            },
          };
        }

        return {
          from() {
            return {
              where() {
                return {
                  limit: async () => [{
                    password_hash: storedPassword.passwordHash,
                    password_salt: storedPassword.passwordSalt,
                  }],
                };
              },
            };
          },
        };
      },
    };
  }
}

test("GraphQL SignIn mutation creates a session for a matching local user", async () => {
  const app = Fastify();
  const config = SignInMutationTestHarness.createConfigMock();
  const authProvider = AuthProviderFactory.createAuthProvider(config);
  const database = {
    getDatabase() {
      return SignInMutationTestHarness.createDatabaseMock() as never;
    },
  };

  await new GraphqlApplication(
    config,
    new AddModelProviderCredentialMutation(database),
    new SignInMutation(authProvider, database),
    new SignUpMutation(authProvider, database),
    new GraphqlRequestContextResolver(authProvider, database),
    new HealthQueryResolver(),
    new MeQueryResolver(),
    new ModelProviderCredentialsQueryResolver(database),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    payload: {
      query: `
        mutation SignIn($input: SignInInput!) {
          SignIn(input: $input) {
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
          email: "user@example.com",
          password: "abc123!",
        },
      },
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.equal(typeof document.data.SignIn.token, "string");
  assert.deepEqual(document.data.SignIn.user, {
    id: "user-graphql-1",
    email: "user@example.com",
    firstName: "User",
    lastName: "One",
    provider: "companyhelm",
    providerSubject: "user-graphql-1",
  });

  await app.close();
});
