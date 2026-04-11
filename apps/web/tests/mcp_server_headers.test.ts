import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_MCP_SERVER_CALL_TIMEOUT_MS,
  formatMcpServerCallTimeout,
  hasIncompleteMcpServerHeaders,
  parseMcpServerHeadersText,
  serializeMcpServerHeaders,
} from "../src/pages/mcp-servers/mcp_server_headers";

test("parses and serializes MCP server headers using the first colon separator", () => {
  const parsedHeaders = parseMcpServerHeadersText(`Authorization: Bearer token:part\nX-Workspace: acme\n`);

  assert.deepEqual(parsedHeaders, [
    {
      name: "Authorization",
      value: "Bearer token:part",
    },
    {
      name: "X-Workspace",
      value: "acme",
    },
  ]);
  assert.equal(
    serializeMcpServerHeaders(parsedHeaders),
    "Authorization: Bearer token:part\nX-Workspace: acme",
  );
});

test("ignores fully empty rows but flags incomplete headers", () => {
  assert.equal(hasIncompleteMcpServerHeaders([
    {
      name: "Authorization",
      value: "",
    },
  ]), true);

  assert.equal(serializeMcpServerHeaders([
    {
      name: "",
      value: "",
    },
    {
      name: "X-Workspace",
      value: "acme",
    },
  ]), "X-Workspace: acme");
});

test("uses a 10 second default timeout and formats whole-second values cleanly", () => {
  assert.equal(DEFAULT_MCP_SERVER_CALL_TIMEOUT_MS, 10_000);
  assert.equal(formatMcpServerCallTimeout(DEFAULT_MCP_SERVER_CALL_TIMEOUT_MS), "10 s");
  assert.equal(formatMcpServerCallTimeout(1_500), "1500 ms");
});
