import assert from "node:assert/strict";
import Fastify from "fastify";
import { test } from "vitest";
import type { ConfigDocument } from "../src/config/schema.ts";
import { GraphqlApplication } from "../src/graphql/graphql_application.ts";
import { GraphqlRequestContextResolver } from "../src/graphql/graphql_request_context.ts";
import { AddModelProviderCredentialMutation } from "../src/graphql/mutations/add_model_provider_credential.ts";
import { SignInMutation } from "../src/graphql/mutations/sign_in.ts";
import { SignUpMutation } from "../src/graphql/mutations/sign_up.ts";
import { HealthQueryResolver } from "../src/graphql/resolvers/health.ts";
import { MeQueryResolver } from "../src/graphql/resolvers/me.ts";

class MeQueryTestHarness {
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
    return {
      getDatabase() {
        return {} as never;
      },
    };
  }
}

test("GraphQL Me query returns the authenticated user and company", async () => {
  const app = Fastify();
  const config = MeQueryTestHarness.createConfigMock();
  const database = MeQueryTestHarness.createDatabaseMock();
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
    async signIn() {
      throw new Error("unused");
    },
    async signUp() {
      throw new Error("unused");
    },
  };

  await new GraphqlApplication(
    config,
    new AddModelProviderCredentialMutation(database),
    new SignInMutation(authProvider as never, database),
    new SignUpMutation(authProvider as never, database),
    new GraphqlRequestContextResolver(authProvider as never, database),
    new HealthQueryResolver(),
    new MeQueryResolver(),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    headers: {
      authorization: "Bearer jwt-token",
    },
    payload: {
      query: `
        query Me {
          Me {
            user {
              id
              email
              firstName
              lastName
            }
            company {
              id
              name
            }
          }
        }
      `,
    },
  });

  assert.equal(response.statusCode, 200);
  const document = response.json();
  assert.deepEqual(document.data.Me, {
    user: {
      id: "user-123",
      email: "user@example.com",
      firstName: "User",
      lastName: "Example",
    },
    company: {
      id: "company-123",
      name: "Example Org",
    },
  });

  await app.close();
});

test("GraphQL Me query rejects unauthenticated requests", async () => {
  const app = Fastify();
  const config = MeQueryTestHarness.createConfigMock();
  const database = MeQueryTestHarness.createDatabaseMock();
  const authProvider = {
    async authenticateBearerToken() {
      throw new Error("unused");
    },
    async signIn() {
      throw new Error("unused");
    },
    async signUp() {
      throw new Error("unused");
    },
  };

  await new GraphqlApplication(
    config,
    new AddModelProviderCredentialMutation(database),
    new SignInMutation(authProvider as never, database),
    new SignUpMutation(authProvider as never, database),
    new GraphqlRequestContextResolver(authProvider as never, database),
    new HealthQueryResolver(),
    new MeQueryResolver(),
  ).register(app);

  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    payload: {
      query: `
        query Me {
          Me {
            user {
              id
            }
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
