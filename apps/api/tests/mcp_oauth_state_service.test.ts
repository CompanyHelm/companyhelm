import assert from "node:assert/strict";
import { test } from "vitest";
import { McpOauthStateService } from "../src/services/mcp/oauth/state_service.ts";

test("McpOauthStateService round-trips the encrypted callback state", () => {
  const service = new McpOauthStateService({
    security: {
      encryption: {
        key: "companyhelm-encryption-key",
        key_id: "companyhelm-security-key",
      },
    },
  } as never);

  const state = service.createState({
    companyId: "company-123",
    mcpServerId: "mcp-server-123",
    organizationSlug: "acme",
    sessionId: "session-123",
    userId: "user-123",
  });
  const decodedState = service.readState(state);

  assert.equal(decodedState.companyId, "company-123");
  assert.equal(decodedState.mcpServerId, "mcp-server-123");
  assert.equal(decodedState.organizationSlug, "acme");
  assert.equal(decodedState.sessionId, "session-123");
  assert.equal(decodedState.userId, "user-123");
  assert.equal(decodedState.keyId, "companyhelm-security-key");
});

test("McpOauthStateService rejects states encrypted with a different key id", () => {
  const issuingService = new McpOauthStateService({
    security: {
      encryption: {
        key: "companyhelm-encryption-key",
        key_id: "state-key-a",
      },
    },
  } as never);
  const readingService = new McpOauthStateService({
    security: {
      encryption: {
        key: "companyhelm-encryption-key",
        key_id: "state-key-b",
      },
    },
  } as never);
  const state = issuingService.createState({
    companyId: "company-123",
    mcpServerId: "mcp-server-123",
    organizationSlug: "acme",
    sessionId: "session-123",
    userId: "user-123",
  });

  assert.throws(
    () => readingService.readState(state),
    /Unknown MCP OAuth state key id/,
  );
});
