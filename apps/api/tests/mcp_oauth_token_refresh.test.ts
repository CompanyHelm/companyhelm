import assert from "node:assert/strict";
import { test } from "vitest";
import { McpService } from "../src/services/mcp/service.ts";

function createQueryResult(rows: unknown[]) {
  return {
    async limit() {
      return rows;
    },
    then<TResult1 = unknown[], TResult2 = never>(
      onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve(rows).then(onfulfilled ?? undefined, onrejected ?? undefined);
    },
  };
}

function createTransactionHarness(options: {
  connectionRows: unknown[];
  serverRows: unknown[];
}) {
  const updateCalls: Array<Record<string, unknown>> = [];
  let selectCallCount = 0;

  const tx = {
    select() {
      selectCallCount += 1;

      return {
        from() {
          return {
            where() {
              if (selectCallCount === 1) {
                return createQueryResult(options.serverRows);
              }

              return createQueryResult(options.connectionRows);
            },
          };
        },
      };
    },
    update() {
      return {
        set(value: Record<string, unknown>) {
          updateCalls.push(value);
          return {
            where() {
              return {
                async returning() {
                  return [];
                },
              };
            },
          };
        },
      };
    },
  };

  return {
    transactionProvider: {
      async transaction<T>(callback: (database: typeof tx) => Promise<T>) {
        return callback(tx);
      },
    },
    updateCalls,
  };
}

test("McpService lazily refreshes expired OAuth tokens when MCP authorization is needed", async () => {
  const service = new McpService(
    {
      decrypt(value: string) {
        return value;
      },
      encrypt(value: string) {
        return {
          encryptedValue: value,
          encryptionKeyId: "enc-key",
        };
      },
    } as never,
    {
      async refreshTokens() {
        return {
          accessToken: "new-access-token",
          expiresAt: new Date("2026-04-11T20:00:00.000Z"),
          rawResponse: {
            access_token: "new-access-token",
          },
          refreshToken: "new-refresh-token",
          scope: ["repo:read"],
          tokenType: "Bearer",
        };
      },
    } as never,
  );
  const harness = createTransactionHarness({
    connectionRows: [{
      accessTokenExpiresAt: new Date("2026-04-11T18:00:00.000Z"),
      authorizationServerMetadata: {
        token_endpoint: "https://auth.example.com/token",
      },
      lastError: null,
      mcpServerId: "mcp-server-123",
      oauthClientId: "client-123",
      oauthClientSecretEncryptedValue: null,
      oauthClientSecretEncryptionKeyId: null,
      requestedScopes: ["repo:read"],
      resourceIndicator: "https://mcp.example.com/",
      resourceMetadataUrl: "https://mcp.example.com/resource-metadata",
      status: "connected",
      tokenEncryptedValue: JSON.stringify({
        accessToken: "old-access-token",
        expiresAt: "2026-04-11T18:00:00.000Z",
        rawResponse: {},
        refreshToken: "refresh-token",
        scope: ["repo:read"],
        tokenType: "Bearer",
      }),
      tokenEncryptionKeyId: "enc-key",
      tokenEndpointAuthMethod: "client_secret_post",
      updatedAt: new Date(),
    }],
    serverRows: [{
      authType: "oauth",
      callTimeoutMs: 10_000,
      companyId: "company-123",
      createdAt: new Date(),
      description: null,
      enabled: true,
      headers: {
        "X-Workspace": "acme",
      },
      id: "mcp-server-123",
      name: "GitHub MCP",
      updatedAt: new Date(),
      url: "https://mcp.example.com/",
    }],
  });

  const headers = await service.resolveMcpServerRequestHeaders(harness.transactionProvider as never, {
    companyId: "company-123",
    mcpServerId: "mcp-server-123",
    now: new Date("2026-04-11T18:30:00.000Z"),
    refreshWindowMs: 60_000,
  });

  assert.deepEqual(headers, {
    Authorization: "Bearer new-access-token",
    "X-Workspace": "acme",
  });
  assert.equal(harness.updateCalls.length, 1);
  assert.equal(harness.updateCalls[0]?.status, "connected");
  assert.equal(harness.updateCalls[0]?.lastError, null);
});

test("McpService marks the OAuth connection degraded when lazy refresh fails", async () => {
  const service = new McpService(
    {
      decrypt(value: string) {
        return value;
      },
      encrypt(value: string) {
        return {
          encryptedValue: value,
          encryptionKeyId: "enc-key",
        };
      },
    } as never,
    {
      async refreshTokens() {
        throw new Error("invalid_grant");
      },
    } as never,
  );
  const harness = createTransactionHarness({
    connectionRows: [{
      accessTokenExpiresAt: new Date("2026-04-11T18:00:00.000Z"),
      authorizationServerMetadata: {
        token_endpoint: "https://auth.example.com/token",
      },
      lastError: null,
      mcpServerId: "mcp-server-123",
      oauthClientId: "client-123",
      oauthClientSecretEncryptedValue: null,
      oauthClientSecretEncryptionKeyId: null,
      requestedScopes: ["repo:read"],
      resourceIndicator: "https://mcp.example.com/",
      resourceMetadataUrl: "https://mcp.example.com/resource-metadata",
      status: "connected",
      tokenEncryptedValue: JSON.stringify({
        accessToken: "old-access-token",
        expiresAt: "2026-04-11T18:00:00.000Z",
        rawResponse: {},
        refreshToken: "refresh-token",
        scope: ["repo:read"],
        tokenType: "Bearer",
      }),
      tokenEncryptionKeyId: "enc-key",
      tokenEndpointAuthMethod: "client_secret_post",
      updatedAt: new Date(),
    }],
    serverRows: [{
      authType: "oauth",
      callTimeoutMs: 10_000,
      companyId: "company-123",
      createdAt: new Date(),
      description: null,
      enabled: true,
      headers: {},
      id: "mcp-server-123",
      name: "GitHub MCP",
      updatedAt: new Date(),
      url: "https://mcp.example.com/",
    }],
  });

  await assert.rejects(
    service.resolveMcpServerRequestHeaders(harness.transactionProvider as never, {
      companyId: "company-123",
      mcpServerId: "mcp-server-123",
      now: new Date("2026-04-11T18:30:00.000Z"),
      refreshWindowMs: 60_000,
    }),
    /invalid_grant/,
  );

  assert.equal(harness.updateCalls.length, 1);
  assert.equal(harness.updateCalls[0]?.status, "degraded");
  assert.equal(harness.updateCalls[0]?.lastError, "invalid_grant");
});
