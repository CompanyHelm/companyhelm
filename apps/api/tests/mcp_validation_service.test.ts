import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { McpValidationService } from "../src/services/mcp/validation_service.ts";

test("McpValidationService validates a draft manual-auth server by listing tools", async () => {
  const service = new McpValidationService(
    {} as never,
    {
      async listTools() {
        return [{ name: "contacts_list" }, { name: "campaign_create" }];
      },
    } as never,
  );

  const result = await service.validateDraft({
    authType: "authorization_header",
    callTimeoutMs: 5_000,
    headers: {
      Authorization: "Bearer token",
    },
    url: "https://mcp.example.com",
  });

  assert.equal(result.status, "ok");
  assert.equal(result.toolCount, 2);
  assert.deepEqual(result.toolNames, ["contacts_list", "campaign_create"]);
  assert.ok(result.validatedAt instanceof Date);
});

test("McpValidationService classifies unauthorized draft validation failures as auth errors", async () => {
  const service = new McpValidationService(
    {} as never,
    {
      listTools: vi.fn().mockRejectedValue(new Error("HTTP 401 Unauthorized")),
    } as never,
  );

  const result = await service.validateDraft({
    authType: "authorization_header",
    callTimeoutMs: 5_000,
    headers: {
      Authorization: "Bearer token",
    },
    url: "https://mcp.example.com",
  });

  assert.equal(result.status, "auth_error");
  assert.equal(result.toolCount, null);
  assert.match(result.errorMessage ?? "", /401/u);
});

test("McpValidationService leaves draft OAuth authorization-code servers in unknown state", async () => {
  const service = new McpValidationService(
    {} as never,
    {
      listTools: vi.fn(),
    } as never,
  );

  const result = await service.validateDraft({
    authType: "oauth_authorization_code",
    callTimeoutMs: 5_000,
    headers: {},
    url: "https://mcp.example.com",
  });

  assert.equal(result.status, "unknown");
  assert.equal(result.validatedAt, null);
  assert.deepEqual(result.toolNames, []);
});
