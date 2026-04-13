import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { McpAuthTypeDetectionService } from "../src/services/mcp/auth_type_detection.ts";

test("McpAuthTypeDetectionService prefers authorization code when the server advertises both OAuth flows", async () => {
  const service = new McpAuthTypeDetectionService({
    discover: vi.fn().mockResolvedValue({
      authorizationServerIssuer: "https://auth.example.com",
      authorizationServerMetadata: {
        authorization_endpoint: "https://auth.example.com/authorize",
        code_challenge_methods_supported: ["S256"],
        grant_types_supported: ["authorization_code", "client_credentials"],
        token_endpoint: "https://auth.example.com/token",
        token_endpoint_auth_methods_supported: ["client_secret_post"],
      },
      protectedResourceMetadata: {
        authorization_servers: ["https://auth.example.com"],
        resource_name: "Supabase MCP",
      },
      resourceMetadataUrl: "https://mcp.example.com/.well-known/oauth-protected-resource",
    }),
  } as never);

  const result = await service.detect({
    url: "https://mcp.example.com",
  });

  assert.equal(result.detectedAuthType, "oauth_authorization_code");
  assert.equal(result.requiresManualClient, true);
  assert.equal(result.wasAutoDetected, true);
  assert.match(String(result.detailMessage), /also advertises client credentials/i);
});

test("McpAuthTypeDetectionService reports client credentials when authorization code is unavailable", async () => {
  const service = new McpAuthTypeDetectionService({
    discover: vi.fn().mockResolvedValue({
      authorizationServerIssuer: "https://auth.example.com",
      authorizationServerMetadata: {
        grant_types_supported: ["client_credentials"],
        token_endpoint: "https://auth.example.com/token",
        token_endpoint_auth_methods_supported: ["client_secret_basic"],
      },
      protectedResourceMetadata: {
        authorization_servers: ["https://auth.example.com"],
        resource_name: "Supabase MCP",
      },
      resourceMetadataUrl: "https://mcp.example.com/.well-known/oauth-protected-resource",
    }),
  } as never);

  const result = await service.detect({
    url: "https://mcp.example.com",
  });

  assert.equal(result.detectedAuthType, "oauth_client_credentials");
  assert.equal(result.requiresManualClient, false);
  assert.equal(result.wasAutoDetected, true);
  assert.match(String(result.detailMessage), /client credentials/i);
});
