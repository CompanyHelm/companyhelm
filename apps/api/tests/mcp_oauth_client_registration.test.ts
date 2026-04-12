import assert from "node:assert/strict";
import { test } from "vitest";
import { McpOauthClientRegistrationService } from "../src/services/mcp/oauth/client_registration.ts";

test("McpOauthClientRegistrationService uses manual credentials when provided", async () => {
  const service = new McpOauthClientRegistrationService();

  const client = await service.registerClient({
    clientName: "CompanyHelm MCP",
    manualClient: {
      clientId: "manual-client-id",
      clientSecret: "manual-client-secret",
      tokenEndpointAuthMethod: "client_secret_post",
    },
    redirectUri: "https://app.example.com/mcp/oauth/callback",
  });

  assert.deepEqual(client, {
    clientId: "manual-client-id",
    clientSecret: "manual-client-secret",
    clientRegistrationMetadata: null,
    tokenEndpointAuthMethod: "client_secret_post",
  });
});

test("McpOauthClientRegistrationService registers a client when DCR is available", async () => {
  const service = new McpOauthClientRegistrationService();
  let requestBody = "";

  const client = await service.registerClient({
    clientName: "CompanyHelm MCP",
    fetchImpl: async (_input, init) => {
      requestBody = String(init?.body || "");
      return Response.json({
        client_id: "dynamic-client-id",
        client_secret: "dynamic-client-secret",
        token_endpoint_auth_method: "client_secret_post",
      });
    },
    redirectUri: "https://app.example.com/mcp/oauth/callback",
    registrationEndpoint: "https://auth.example.com/register",
  });

  assert.equal(client.clientId, "dynamic-client-id");
  assert.equal(client.clientSecret, "dynamic-client-secret");
  assert.equal(client.tokenEndpointAuthMethod, "client_secret_post");
  assert.match(requestBody, /redirect_uris/);
});

test("McpOauthClientRegistrationService fails clearly when neither manual creds nor DCR are available", async () => {
  const service = new McpOauthClientRegistrationService();

  await assert.rejects(
    service.registerClient({
      clientName: "CompanyHelm MCP",
      redirectUri: "https://app.example.com/mcp/oauth/callback",
    }),
    /manual client/i,
  );
});
