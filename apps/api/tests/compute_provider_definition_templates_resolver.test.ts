import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { ComputeProviderDefinitionTemplatesResolver } from "../src/graphql/resolvers/compute_provider_definition_templates.ts";
import type { GraphqlRequestContext } from "../src/graphql/graphql_request_context.ts";

class ComputeProviderDefinitionTemplatesResolverTestHarness {
  static createContext(): GraphqlRequestContext {
    return {
      authSession: {
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk",
          providerSubject: "user_clerk_123",
        },
        company: {
          id: "company-123",
          name: "Example Org",
        },
      },
      app_runtime_transaction_provider: {
        async transaction(transaction) {
          return transaction({} as never);
        },
      },
      resolveSubscriptionContext: null,
    };
  }
}

test("ComputeProviderDefinitionTemplatesResolver returns an empty list for legacy unsupported providers", async () => {
  const resolver = new ComputeProviderDefinitionTemplatesResolver({
    async listTemplatesForProvider() {
      throw new Error("Compute provider daytona is not configured.");
    },
  } as never);

  const templates = await resolver.execute(
    {
      id: "definition-1",
    },
    {},
    ComputeProviderDefinitionTemplatesResolverTestHarness.createContext(),
  );

  assert.deepEqual(templates, []);
});

test("ComputeProviderDefinitionTemplatesResolver rethrows unrelated template lookup failures", async () => {
  const resolver = new ComputeProviderDefinitionTemplatesResolver({
    async listTemplatesForProvider() {
      throw new Error("E2B API key is invalid.");
    },
  } as never);

  await assert.rejects(
    resolver.execute(
      {
        id: "definition-1",
      },
      {},
      ComputeProviderDefinitionTemplatesResolverTestHarness.createContext(),
    ),
    /E2B API key is invalid\./,
  );
});
