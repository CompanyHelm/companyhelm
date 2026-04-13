import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { McpOauthCompleteConnectionService } from "../src/services/mcp/oauth/complete_connection_service.ts";

test("McpOauthCompleteConnectionService stores the exchanged token expiry when completing OAuth", async () => {
  const insertedConnections: Record<string, unknown>[] = [];
  const completedAt = new Date("2026-04-13T04:30:00.000Z");
  const tokenExpiresAt = new Date("2026-04-13T05:30:00.000Z");

  const service = new McpOauthCompleteConnectionService(
    {
      decrypt: vi.fn().mockReturnValue("dynamic-client-secret"),
      encrypt: vi.fn().mockImplementation((value: string) => ({
        encryptedValue: `encrypted:${value}`,
        encryptionKeyId: "enc-key",
      })),
    } as never,
    {
      readState: vi.fn().mockReturnValue({
        companyId: "company-123",
        issuedAt: "2026-04-13T04:00:00.000Z",
        keyId: "companyhelm-local-key",
        mcpServerId: "mcp-server-123",
        organizationSlug: "acme",
        sessionId: "session-123",
        userId: "user-123",
      }),
    } as never,
    {
      exchangeAuthorizationCode: vi.fn().mockResolvedValue({
        accessToken: "access-token",
        expiresAt: tokenExpiresAt,
        rawResponse: {
          access_token: "access-token",
          expires_in: 3600,
          token_type: "Bearer",
        },
        refreshToken: "refresh-token",
        scope: ["projects:read"],
        tokenType: "Bearer",
      }),
    } as never,
  );

  const result = await service.completeConnection({
    authenticatedUserId: "user-123",
    code: "oauth-code",
    database: {
      delete() {
        return {
          async where() {
            return undefined;
          },
        };
      },
      insert() {
        return {
          values(value: Record<string, unknown>) {
            insertedConnections.push(value);
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
                    return [{
                      authorizationServerIssuer: "https://api.supabase.com",
                      authorizationServerMetadata: {
                        token_endpoint: "https://api.supabase.com/v1/oauth/token",
                      },
                      clientRegistrationMetadata: {
                        client_id: "dynamic-client-id",
                      },
                      clientType: "dynamic_registration",
                      codeVerifier: "pkce-verifier",
                      companyId: "company-123",
                      completedAt: null,
                      createdByUserId: "user-123",
                      expiresAt: new Date("2026-04-13T04:40:00.000Z"),
                      id: "session-123",
                      mcpServerId: "mcp-server-123",
                      oauthClientId: "dynamic-client-id",
                      oauthClientSecretEncryptedValue: "encrypted-client-secret",
                      oauthClientSecretEncryptionKeyId: "enc-key",
                      protectedResourceMetadata: {
                        resource: "https://mcp.supabase.com/mcp",
                      },
                      redirectUri: "http://localhost:5173/mcp/oauth/callback",
                      requestedScopes: ["projects:read"],
                      resourceIndicator: "https://mcp.supabase.com/mcp",
                      resourceMetadataUrl: "https://mcp.supabase.com/.well-known/oauth-protected-resource/mcp",
                      state: "opaque-state",
                      tokenEndpointAuthMethod: "client_secret_post",
                    }];
                  },
                };
              },
            };
          },
        };
      },
      update() {
        return {
          set() {
            return {
              async where() {
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
    } as never,
    now: completedAt,
    state: "opaque-state",
  });

  assert.equal(result.companyId, "company-123");
  assert.equal(result.mcpServerId, "mcp-server-123");
  assert.equal(result.organizationSlug, "acme");
  assert.equal(insertedConnections.length, 1);
  assert.equal(insertedConnections[0]?.accessTokenExpiresAt, tokenExpiresAt);
});
