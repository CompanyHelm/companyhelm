import assert from "node:assert/strict";
import { test } from "vitest";
import { McpOauthDiscoveryService } from "../src/services/mcp/oauth/discovery.ts";

test("McpOauthDiscoveryService follows the MCP challenge to protected resource and AS metadata", async () => {
  const responses = new Map<string, Response>([
    [
      "https://mcp.example.com/",
      new Response("", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
        },
      }),
    ],
    [
      "https://mcp.example.com/.well-known/oauth-protected-resource",
      Response.json({
        authorization_servers: ["https://auth.example.com"],
        resource: "https://mcp.example.com/",
      }),
    ],
    [
      "https://auth.example.com/.well-known/oauth-authorization-server",
      Response.json({
        authorization_endpoint: "https://auth.example.com/oauth/authorize",
        token_endpoint: "https://auth.example.com/oauth/token",
      }),
    ],
  ]);
  const service = new McpOauthDiscoveryService();

  const discovery = await service.discover({
    fetchImpl: async (input) => {
      const response = responses.get(String(input));
      if (!response) {
        throw new Error(`Unexpected fetch: ${String(input)}`);
      }

      return response;
    },
    mcpServerUrl: "https://mcp.example.com/",
  });

  assert.equal(
    discovery.resourceMetadataUrl,
    "https://mcp.example.com/.well-known/oauth-protected-resource",
  );
  assert.equal(discovery.authorizationServerIssuer, "https://auth.example.com");
  assert.equal(
    discovery.authorizationServerMetadata.authorization_endpoint,
    "https://auth.example.com/oauth/authorize",
  );
});

test("McpOauthDiscoveryService falls back to OIDC discovery when RFC8414 metadata is unavailable", async () => {
  const service = new McpOauthDiscoveryService();

  const discovery = await service.discover({
    fetchImpl: async (input) => {
      const url = String(input);
      if (url === "https://mcp.example.com/") {
        return new Response("", {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Bearer resource_metadata="https://mcp.example.com/resource-metadata"',
          },
        });
      }
      if (url === "https://mcp.example.com/resource-metadata") {
        return Response.json({
          authorization_servers: ["https://issuer.example.com"],
        });
      }
      if (url === "https://issuer.example.com/.well-known/oauth-authorization-server") {
        return new Response("missing", { status: 404 });
      }
      if (url === "https://issuer.example.com/.well-known/openid-configuration") {
        return Response.json({
          authorization_endpoint: "https://issuer.example.com/authorize",
          token_endpoint: "https://issuer.example.com/token",
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    },
    mcpServerUrl: "https://mcp.example.com/",
  });

  assert.equal(
    discovery.authorizationServerMetadata.token_endpoint,
    "https://issuer.example.com/token",
  );
});

test("McpOauthDiscoveryService rejects MCP servers that do not advertise resource_metadata", async () => {
  const service = new McpOauthDiscoveryService();

  await assert.rejects(
    service.discover({
      fetchImpl: async () => new Response("", { status: 401 }),
      mcpServerUrl: "https://mcp.example.com/",
    }),
    /resource_metadata/,
  );
});
