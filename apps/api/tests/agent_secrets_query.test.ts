import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentSecretsQueryResolver } from "../src/graphql/resolvers/agent_secrets.ts";

test("AgentSecretsQueryResolver lists agent default secrets for the authenticated company", async () => {
  const calls: Array<{ agentId: string; companyId: string }> = [];
  const resolver = new AgentSecretsQueryResolver({
    async listAgentSecrets(_transactionProvider, companyId: string, agentId: string) {
      calls.push({
        agentId,
        companyId,
      });

      return [{
        companyId,
        createdAt: new Date("2026-03-30T21:00:00.000Z"),
        description: "Primary repository token",
        envVarName: "GITHUB_TOKEN",
        id: "secret-1",
        name: "GitHub Token",
        updatedAt: new Date("2026-03-30T21:05:00.000Z"),
      }];
    },
  } as never);

  const result = await resolver.execute(
    null,
    {
      agentId: "agent-1",
    },
    {
      app_runtime_transaction_provider: {} as never,
      authSession: {
        company: {
          id: "company-123",
          name: "Example Org",
        },
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk",
          providerSubject: "user_clerk_123",
        },
      },
    },
  );

  assert.deepEqual(calls, [{
    agentId: "agent-1",
    companyId: "company-123",
  }]);
  assert.deepEqual(result, [{
    companyId: "company-123",
    createdAt: "2026-03-30T21:00:00.000Z",
    description: "Primary repository token",
    envVarName: "GITHUB_TOKEN",
    id: "secret-1",
    name: "GitHub Token",
    updatedAt: "2026-03-30T21:05:00.000Z",
  }]);
});
