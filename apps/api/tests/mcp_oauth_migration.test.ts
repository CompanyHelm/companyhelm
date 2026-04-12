import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "vitest";

test("mcp oauth migration adds the auth_type column and oauth tables", () => {
  const migrationSql = readFileSync(
    new URL("../drizzle/0089_mcp_oauth.sql", import.meta.url),
    "utf8",
  );

  assert.match(
    migrationSql,
    /ALTER TABLE "mcp_servers" ADD COLUMN IF NOT EXISTS "auth_type" text DEFAULT 'none' NOT NULL;/,
  );
  assert.match(migrationSql, /CREATE TABLE "mcp_oauth_connections"/);
  assert.match(migrationSql, /CREATE TABLE "mcp_oauth_sessions"/);
});

test("graphql schema exposes MCP OAuth fields and mutations", () => {
  const graphqlSchema = readFileSync(
    new URL("../src/graphql/schema/schema.graphql", import.meta.url),
    "utf8",
  );

  assert.match(graphqlSchema, /enum McpServerAuthType/);
  assert.match(graphqlSchema, /oauthConnectionStatus: McpOauthConnectionStatus/);
  assert.match(graphqlSchema, /StartMcpServerOAuth\(input: StartMcpServerOAuthInput!\): StartMcpServerOAuthPayload!/);
  assert.match(graphqlSchema, /CompleteMcpServerOAuth\(input: CompleteMcpServerOAuthInput!\): CompleteMcpServerOAuthPayload!/);
  assert.match(graphqlSchema, /DisconnectMcpServerOAuth\(input: DisconnectMcpServerOAuthInput!\): McpServer!/);
});
