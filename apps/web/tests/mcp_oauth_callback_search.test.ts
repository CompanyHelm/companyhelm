import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveMcpOauthCallbackSearch } from "../src/pages/mcp-servers/mcp_oauth_callback_search";

test("parses code and state from the MCP OAuth callback query string", () => {
  assert.deepEqual(
    resolveMcpOauthCallbackSearch("?code=oauth-code&state=opaque-state"),
    {
      code: "oauth-code",
      state: "opaque-state",
    },
  );
});

test("normalizes missing MCP OAuth callback params to empty strings", () => {
  assert.deepEqual(
    resolveMcpOauthCallbackSearch(""),
    {
      code: "",
      state: "",
    },
  );
});
