import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { SessionSecretsQueryResolver } from "../src/graphql/resolvers/session_secrets.ts";

test("SessionSecretsQueryResolver lists attached secrets for the authenticated company session", async () => {
  const calls: Array<{ companyId: string; sessionId: string }> = [];
  const resolver = new SessionSecretsQueryResolver({
    async listSessionSecrets(_transactionProvider, companyId: string, sessionId: string) {
      calls.push({
        companyId,
        sessionId,
      });

      return [{
        companyId,
        createdAt: new Date("2026-03-30T18:00:00.000Z"),
        description: "GitHub installation token",
        envVarName: "GITHUB_TOKEN",
        id: "secret-1",
        name: "GitHub Token",
        updatedAt: new Date("2026-03-30T18:05:00.000Z"),
      }];
    },
  } as never);

  const result = await resolver.execute(
    null,
    {
      sessionId: "session-1",
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
    companyId: "company-123",
    sessionId: "session-1",
  }]);
  assert.deepEqual(result, [{
    companyId: "company-123",
    createdAt: "2026-03-30T18:00:00.000Z",
    description: "GitHub installation token",
    envVarName: "GITHUB_TOKEN",
    id: "secret-1",
    name: "GitHub Token",
    updatedAt: "2026-03-30T18:05:00.000Z",
  }]);
});
