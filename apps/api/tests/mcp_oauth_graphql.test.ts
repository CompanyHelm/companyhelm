import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { ConnectMcpServerOauthClientCredentialsMutation } from "../src/graphql/mutations/connect_mcp_server_oauth_client_credentials.ts";
import { CompleteMcpServerOauthMutation } from "../src/graphql/mutations/complete_mcp_server_oauth.ts";
import { DisconnectMcpServerOauthMutation } from "../src/graphql/mutations/disconnect_mcp_server_oauth.ts";
import { StartMcpServerOauthMutation } from "../src/graphql/mutations/start_mcp_server_oauth.ts";

function createLoggerMock() {
  return {
    getLogger() {
      return {
        error() {
          return undefined;
        },
      };
    },
  };
}

test("StartMcpServerOauthMutation returns an authorization URL and stores a pending session", async () => {
  const insertedValues: Record<string, unknown>[] = [];
  const deletedWhereConditions: unknown[] = [];
  const stateService = {
    createState: vi.fn().mockReturnValue("opaque-state"),
  };
  const resolveForCompany = vi.fn().mockResolvedValue("acme");
  const mutation = new StartMcpServerOauthMutation(
    {
      webPublicUrl: "https://app.example.com",
    } as never,
    {
      getMcpServer: vi.fn().mockResolvedValue({
        authType: "oauth_authorization_code",
        callTimeoutMs: 10_000,
        companyId: "company-123",
        createdAt: new Date(),
        description: null,
        enabled: true,
        headers: {},
        id: "mcp-server-123",
        lastValidatedAt: null,
        lastValidationError: null,
        lastValidationStatus: "unknown",
        lastValidationToolCount: null,
        name: "GitHub MCP",
        oauthClientId: null,
        oauthConnectionStatus: "not_connected",
        oauthGrantedScopes: [],
        oauthLastError: null,
        oauthRequestedScopes: [],
        updatedAt: new Date(),
        url: "https://mcp.example.com/",
      }),
    } as never,
    {
      discover: vi.fn().mockResolvedValue({
        authorizationServerIssuer: "https://auth.example.com",
        authorizationServerMetadata: {
          authorization_endpoint: "https://auth.example.com/authorize",
          registration_endpoint: "https://auth.example.com/register",
        },
        protectedResourceMetadata: {
          resource: "https://mcp.example.com/",
        },
        resourceMetadataUrl: "https://mcp.example.com/resource-metadata",
      }),
    } as never,
    {
      registerClient: vi.fn().mockResolvedValue({
        clientId: "client-123",
        clientSecret: "client-secret-123",
        clientRegistrationMetadata: {
          client_id: "client-123",
        },
        tokenEndpointAuthMethod: "client_secret_post",
      }),
    } as never,
    stateService as never,
    {
      encrypt(value: string) {
        return {
          encryptedValue: `encrypted:${value}`,
          encryptionKeyId: "enc-key",
        };
      },
    } as never,
    createLoggerMock() as never,
    {
      resolveForCompany,
    } as never,
  );

  const payload = await mutation.execute(
    {},
    {
      input: {
        mcpServerId: "mcp-server-123",
        requestedScopes: ["repo:read", "mcp:tools"],
      },
    },
    {
      authSession: {
        company: {
          id: "company-123",
          name: "Acme",
        },
        user: {
          id: "user-123",
        },
      },
      app_runtime_transaction_provider: {
        async transaction(callback: (tx: unknown) => Promise<unknown>) {
          return callback({
            delete() {
              return {
                where(condition: unknown) {
                  deletedWhereConditions.push(condition);
                  return Promise.resolve();
                },
              };
            },
            insert() {
              return {
                values(value: Record<string, unknown>) {
                  insertedValues.push(value);
                  return {
                    async returning() {
                      return [];
                    },
                  };
                },
              };
            },
            select() {
              return {
                from() {
                  return {
                    where() {
                      return {
                        async limit() {
                          return [];
                        },
                      };
                    },
                  };
                },
              };
            },
          });
        },
      },
    } as never,
  );

  assert.match(payload.authorizationUrl, /^https:\/\/auth\.example\.com\/authorize\?/);
  assert.match(payload.authorizationUrl, /state=opaque-state/);
  assert.equal(insertedValues.length, 1);
  assert.equal(insertedValues[0]?.companyId, "company-123");
  assert.equal(insertedValues[0]?.mcpServerId, "mcp-server-123");
  assert.deepEqual(insertedValues[0]?.requestedScopes, ["repo:read", "mcp:tools"]);
  assert.equal(deletedWhereConditions.length, 1);
  assert.deepEqual(resolveForCompany.mock.calls[0]?.[1], "company-123");
  assert.deepEqual(stateService.createState.mock.calls[0]?.[0], {
    companyId: "company-123",
    mcpServerId: "mcp-server-123",
    organizationSlug: "acme",
    sessionId: insertedValues[0]?.id,
    userId: "user-123",
  });
});

test("CompleteMcpServerOauthMutation uses the signed callback state to target the original company", async () => {
  const scopedCompanyIds: string[] = [];
  const mutation = new CompleteMcpServerOauthMutation(
    {
      async withCompanyContext(companyId: string, callback: (database: unknown) => Promise<unknown>) {
        scopedCompanyIds.push(companyId);
        return callback({
          select() {
            return {
              from() {
                return {
                  where() {
                    return {
                      async limit() {
                        return [{
                          userId: "user-123",
                        }];
                      },
                    };
                  },
                };
              },
            };
          },
        });
      },
    } as never,
    {
      completeConnection: vi.fn().mockResolvedValue({
        companyId: "company-target",
        mcpServerId: "mcp-server-123",
        organizationSlug: "target-org",
      }),
    } as never,
    {
      readState: vi.fn().mockReturnValue({
        companyId: "company-target",
        mcpServerId: "mcp-server-123",
        organizationSlug: "target-org",
        sessionId: "session-123",
        userId: "user-123",
      }),
    } as never,
    {
      getMcpServer: vi.fn().mockResolvedValue({
        authType: "oauth_authorization_code",
        callTimeoutMs: 10_000,
        companyId: "company-target",
        createdAt: new Date("2026-04-11T18:00:00.000Z"),
        description: null,
        enabled: true,
        headers: {},
        id: "mcp-server-123",
        lastValidatedAt: new Date("2026-04-11T18:02:00.000Z"),
        lastValidationError: null,
        lastValidationStatus: "ok",
        lastValidationToolCount: 3,
        name: "GitHub MCP",
        oauthClientId: "client-123",
        oauthConnectionStatus: "connected",
        oauthGrantedScopes: ["repo:read"],
        oauthLastError: null,
        oauthRequestedScopes: ["repo:read"],
        updatedAt: new Date("2026-04-11T18:01:00.000Z"),
        url: "https://mcp.example.com/",
      }),
      updateMcpServerValidation: vi.fn().mockImplementation(async (_tx, input) => ({
        authType: "oauth_authorization_code",
        callTimeoutMs: 10_000,
        companyId: input.companyId,
        createdAt: new Date("2026-04-11T18:00:00.000Z"),
        description: null,
        enabled: true,
        headers: {},
        id: input.mcpServerId,
        lastValidatedAt: input.lastValidatedAt,
        lastValidationError: input.lastValidationError,
        lastValidationStatus: input.lastValidationStatus,
        lastValidationToolCount: input.lastValidationToolCount,
        name: "GitHub MCP",
        oauthClientId: "client-123",
        oauthConnectionStatus: "connected",
        oauthGrantedScopes: ["repo:read"],
        oauthLastError: null,
        oauthRequestedScopes: ["repo:read"],
        updatedAt: new Date("2026-04-11T18:01:00.000Z"),
        url: "https://mcp.example.com/",
      })),
    } as never,
    {
      validatePersistedServer: vi.fn().mockResolvedValue({
        errorMessage: null,
        status: "ok",
        toolCount: 3,
        toolNames: ["issues", "pulls", "repos"],
        validatedAt: new Date("2026-04-11T18:02:00.000Z"),
      }),
    } as never,
    createLoggerMock() as never,
  );

  const payload = await mutation.execute(
    {},
    {
      input: {
        code: "oauth-code",
        state: "opaque-state",
      },
    },
    {
      authSession: {
        company: null,
        user: {
          id: "user-123",
        },
      },
    } as never,
  );

  assert.deepEqual(scopedCompanyIds, ["company-target"]);
  assert.equal(payload.organizationSlug, "target-org");
  assert.equal(payload.mcpServer.id, "mcp-server-123");
  assert.equal(payload.mcpServer.oauthConnectionStatus, "connected");
});

test("DisconnectMcpServerOauthMutation deletes the connection and any pending sessions", async () => {
  const deletedWhereConditions: unknown[] = [];
  const mutation = new DisconnectMcpServerOauthMutation({
    getMcpServer: vi.fn().mockResolvedValue({
      authType: "oauth_authorization_code",
      callTimeoutMs: 10_000,
      companyId: "company-123",
      createdAt: new Date(),
      description: null,
      enabled: true,
      headers: {},
      id: "mcp-server-123",
      lastValidatedAt: null,
      lastValidationError: null,
      lastValidationStatus: "unknown",
      lastValidationToolCount: null,
      name: "GitHub MCP",
      oauthClientId: null,
      oauthConnectionStatus: "not_connected",
      oauthGrantedScopes: [],
      oauthLastError: null,
      oauthRequestedScopes: [],
      updatedAt: new Date(),
      url: "https://mcp.example.com/",
    }),
      updateMcpServerValidation: vi.fn().mockImplementation(async (_tx, input) => ({
        authType: "oauth_authorization_code",
        callTimeoutMs: 10_000,
        companyId: input.companyId,
        createdAt: new Date(),
        description: null,
        enabled: true,
        headers: {},
        id: input.mcpServerId,
        lastValidatedAt: null,
        lastValidationError: null,
        lastValidationStatus: "unknown",
        lastValidationToolCount: null,
        name: "GitHub MCP",
        oauthClientId: null,
        oauthConnectionStatus: "not_connected",
        oauthGrantedScopes: [],
        oauthLastError: null,
        oauthRequestedScopes: [],
        updatedAt: new Date(),
        url: "https://mcp.example.com/",
      })),
  } as never);

  const payload = await mutation.execute(
    {},
    {
      input: {
        mcpServerId: "mcp-server-123",
      },
    },
    {
      authSession: {
        company: {
          id: "company-123",
          name: "Acme",
        },
        user: {
          id: "user-123",
        },
      },
      app_runtime_transaction_provider: {
        async transaction(callback: (tx: unknown) => Promise<unknown>) {
          return callback({
            delete() {
              return {
                where(condition: unknown) {
                  deletedWhereConditions.push(condition);
                  return Promise.resolve();
                },
              };
            },
          });
        },
      },
    } as never,
  );

  assert.equal(payload.id, "mcp-server-123");
  assert.equal(deletedWhereConditions.length, 2);
});

test("ConnectMcpServerOauthClientCredentialsMutation stores a connected client-credentials server", async () => {
  const connect = vi.fn().mockResolvedValue(undefined);
  const getMcpServer = vi
    .fn()
    .mockResolvedValueOnce({
      authType: "oauth_client_credentials",
      callTimeoutMs: 10_000,
      companyId: "company-123",
      createdAt: new Date("2026-04-12T18:00:00.000Z"),
      description: null,
      enabled: true,
      headers: {},
      id: "mcp-server-123",
      lastValidatedAt: null,
      lastValidationError: null,
      lastValidationStatus: "unknown",
      lastValidationToolCount: null,
      name: "Supabase MCP",
      oauthClientId: null,
      oauthConnectionStatus: "not_connected",
      oauthGrantedScopes: [],
      oauthLastError: null,
      oauthRequestedScopes: [],
      updatedAt: new Date("2026-04-12T18:00:00.000Z"),
      url: "https://mcp.supabase.com/mcp",
    })
    .mockResolvedValueOnce({
      authType: "oauth_client_credentials",
      callTimeoutMs: 10_000,
      companyId: "company-123",
      createdAt: new Date("2026-04-12T18:00:00.000Z"),
      description: null,
      enabled: true,
      headers: {},
      id: "mcp-server-123",
      lastValidatedAt: new Date("2026-04-12T18:02:00.000Z"),
      lastValidationError: null,
      lastValidationStatus: "ok",
      lastValidationToolCount: 5,
      name: "Supabase MCP",
      oauthClientId: "client-123",
      oauthConnectionStatus: "connected",
      oauthGrantedScopes: ["projects:read"],
      oauthLastError: null,
      oauthRequestedScopes: ["projects:read"],
      updatedAt: new Date("2026-04-12T18:01:00.000Z"),
      url: "https://mcp.supabase.com/mcp",
    });
  const mutation = new ConnectMcpServerOauthClientCredentialsMutation(
    {
      getMcpServer,
      updateMcpServerValidation: vi.fn().mockImplementation(async (_tx, input) => ({
        authType: "oauth_client_credentials",
        callTimeoutMs: 10_000,
        companyId: input.companyId,
        createdAt: new Date("2026-04-12T18:00:00.000Z"),
        description: null,
        enabled: true,
        headers: {},
        id: input.mcpServerId,
        lastValidatedAt: input.lastValidatedAt,
        lastValidationError: input.lastValidationError,
        lastValidationStatus: input.lastValidationStatus,
        lastValidationToolCount: input.lastValidationToolCount,
        name: "Supabase MCP",
        oauthClientId: "client-123",
        oauthConnectionStatus: "connected",
        oauthGrantedScopes: ["projects:read"],
        oauthLastError: null,
        oauthRequestedScopes: ["projects:read"],
        updatedAt: new Date("2026-04-12T18:01:00.000Z"),
        url: "https://mcp.supabase.com/mcp",
      })),
    } as never,
    {
      connect,
    } as never,
    {
      validatePersistedServer: vi.fn().mockResolvedValue({
        errorMessage: null,
        status: "ok",
        toolCount: 5,
        toolNames: ["a", "b", "c", "d", "e"],
        validatedAt: new Date("2026-04-12T18:02:00.000Z"),
      }),
    } as never,
  );

  const payload = await mutation.execute(
    {},
    {
      input: {
        mcpServerId: "mcp-server-123",
        oauthClientId: "client-123",
        oauthClientSecret: "secret-123",
        requestedScopes: ["projects:read"],
      },
    },
    {
      authSession: {
        company: {
          id: "company-123",
          name: "Acme",
        },
        user: {
          id: "user-123",
        },
      },
      app_runtime_transaction_provider: {
        async transaction<T>(callback: (tx: unknown) => Promise<T>) {
          return callback({});
        },
      },
    } as never,
  );

  assert.equal(connect.mock.calls.length, 1);
  assert.equal(payload.id, "mcp-server-123");
  assert.equal(payload.oauthConnectionStatus, "connected");
});
