import assert from "node:assert/strict";
import { test } from "vitest";
import { McpAuthTypeDetectionService } from "../../src/services/mcp/auth_type_detection.ts";
import { McpOauthDiscoveryService } from "../../src/services/mcp/oauth/discovery.ts";

type PublicMcpOauthServerFixture = {
  expectedResourceMetadataUrl: string;
  name: string;
  url: string;
};

const publicMcpOauthServers: PublicMcpOauthServerFixture[] = [
  {
    expectedResourceMetadataUrl: "https://mcp.grafana.com/.well-known/oauth-protected-resource/mcp",
    name: "Grafana Cloud",
    url: "https://mcp.grafana.com/mcp",
  },
  {
    expectedResourceMetadataUrl: "https://mcp.notion.com/.well-known/oauth-protected-resource/mcp",
    name: "Notion",
    url: "https://mcp.notion.com/mcp",
  },
  {
    expectedResourceMetadataUrl: "https://mcp.supabase.com/.well-known/oauth-protected-resource/mcp",
    name: "Supabase",
    url: "https://mcp.supabase.com/mcp",
  },
];

function createTimeoutFetch(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const timeoutController = new AbortController();
    const timeoutHandle = setTimeout(() => {
      timeoutController.abort();
    }, timeoutMs);
    const signal = init?.signal
      ? AbortSignal.any([init.signal, timeoutController.signal])
      : timeoutController.signal;

    try {
      return await fetch(input, {
        ...init,
        signal,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }
  };
}

test("CompanyHelm OSS can discover OAuth metadata from public MCP servers with path-scoped resource metadata", { timeout: 30_000 }, async () => {
  const discoveryService = new McpOauthDiscoveryService();
  const authTypeDetectionService = new McpAuthTypeDetectionService(discoveryService);
  const fetchImpl = createTimeoutFetch(15_000);

  for (const server of publicMcpOauthServers) {
    const discovery = await discoveryService.discover({
      fetchImpl,
      mcpServerUrl: server.url,
    });

    assert.equal(
      discovery.resourceMetadataUrl,
      server.expectedResourceMetadataUrl,
      `${server.name} should advertise the expected protected resource metadata URL.`,
    );
    assert.ok(
      authTypeDetectionService.supportsAuthorizationCode(discovery),
      `${server.name} should support OAuth authorization code discovery.`,
    );
    assert.ok(
      typeof discovery.authorizationServerMetadata.authorization_endpoint === "string"
        && discovery.authorizationServerMetadata.authorization_endpoint.length > 0,
      `${server.name} should expose an authorization endpoint.`,
    );
    assert.ok(
      typeof discovery.authorizationServerMetadata.token_endpoint === "string"
        && discovery.authorizationServerMetadata.token_endpoint.length > 0,
      `${server.name} should expose a token endpoint.`,
    );

    if (server.name === "Grafana Cloud") {
      const detection = await authTypeDetectionService.detect({
        url: server.url,
      });
      assert.equal(
        detection.detectedAuthType,
        "oauth_authorization_code",
        `${server.name} should auto-detect OAuth authorization code.`,
      );
      assert.equal(
        detection.wasAutoDetected,
        true,
        `${server.name} should be auto-detected through the public MCP endpoint.`,
      );
    }
  }
});
