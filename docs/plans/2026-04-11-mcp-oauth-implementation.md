# MCP OAuth Authorization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add legacy-parity MCP OAuth connection support to `companyhelm-ng` so shared remote MCP servers can be connected through OAuth 2.1 authorization code + PKCE, persisted securely, and surfaced in the management UI.

**Architecture:** Reuse the legacy `companyhelm-api` flow conceptually, but adapt it to `companyhelm-ng` conventions instead of porting files verbatim. In particular: keep `ng` MCP servers HTTP-only, use `ng` Drizzle/GraphQL naming, use encrypted callback state tied to the authenticated Clerk user and company, and handle the OAuth callback in the web app through a Relay mutation rather than a plain API text page. This follows the MCP authorization tutorial’s required flow: PRM discovery from `WWW-Authenticate`, authorization-server discovery, DCR or manual client registration, authorization code + PKCE, encrypted token storage, and secure callback handling.

**Tech Stack:** TypeScript, Fastify/Mercurius, Drizzle, Clerk auth, React/Relay, `SecretEncryptionService`, MCP OAuth 2.1 / RFC 9728 / RFC 8707 resource indicators.

---

### Task 1: Reshape the `ng` MCP data model for OAuth

**Files:**
- Modify: `apps/api/src/config/schema.ts`
- Modify: `apps/api/config/local.yaml`
- Modify: `apps/api/src/db/schema/mcp.ts`
- Create: `apps/api/drizzle/0089_mcp_oauth.sql`
- Modify: `apps/api/src/graphql/schema/schema.graphql`
- Modify: `apps/api/src/graphql/mcp_server_presenter.ts`
- Modify: `apps/api/src/services/mcp/service.ts`
- Create: `apps/api/tests/mcp_oauth_migration.test.ts`

**Step 1: Add the missing MCP auth shape**

Keep `companyhelm-ng` scoped to remote HTTP MCP servers only. Do not port the legacy `stdio` or `command` fields. Add explicit auth primitives instead:
- `authType` enum on `mcp_servers`, with `none`, `custom_headers`, and `oauth`
- keep the existing `headers` JSONB as additional/custom headers instead of introducing the legacy header table
- add OAuth connection status and last error to the GraphQL `McpServer` type

This keeps the `ng` schema simple while still making OAuth a first-class mode instead of an implicit side effect of generic headers.

**Step 2: Add secure OAuth persistence tables**

Create `mcp_oauth_connections` and `mcp_oauth_sessions` in `apps/api/src/db/schema/mcp.ts`, using `ng` naming conventions:
- store metadata documents as `jsonb`
- store `requestedScopes` and `grantedScopes` as arrays or another structured form, not space-delimited legacy text
- store encrypted token payloads and manual client secrets using `SecretEncryptionService` fields (`encryptedValue`, `encryptionKeyId`) rather than the old nonce/tag columns
- store expiry timestamps, `status`, `lastError`, `createdByUserId`, and `updatedByUserId`

**Step 3: Add callback URL configuration**

Add a dedicated frontend callback base such as `webPublicUrl` to API config. Do not derive the web redirect URI from request headers. The API should build one deterministic OAuth redirect URI for web callbacks, for example:
- `${webPublicUrl}/mcp/oauth/callback`

This is cleaner than the legacy `host`/`x-forwarded-*` callback construction and avoids mismatches during DCR.

**Step 4: Expose the new fields through GraphQL**

Extend `McpServer` and the create/update inputs so the web app can read and edit:
- `authType`
- `oauthConnectionStatus`
- `oauthLastError`
- optional OAuth helper inputs used only when starting the flow, not as durable server columns

Keep `headersText` as the serialized representation of the existing JSONB headers.

**Step 5: Verify the schema and migration**

Run:
- `npm run db:generate`
- `npm run check -w @companyhelm/api`
- `npm exec -w @companyhelm/api -- vitest run tests/mcp_oauth_migration.test.ts`

Expected:
- the migration is generated cleanly
- API typecheck/lint passes
- the migration test proves the new OAuth tables and GraphQL fields exist

### Task 2: Add reusable MCP OAuth client utilities to the API

**Files:**
- Create: `apps/api/src/services/mcp/oauth/discovery.ts`
- Create: `apps/api/src/services/mcp/oauth/client_registration.ts`
- Create: `apps/api/src/services/mcp/oauth/state_service.ts`
- Create: `apps/api/src/services/mcp/oauth/complete_connection_service.ts`
- Create: `apps/api/src/services/mcp/oauth/types.ts`
- Create: `apps/api/tests/mcp_oauth_discovery.test.ts`
- Create: `apps/api/tests/mcp_oauth_client_registration.test.ts`
- Create: `apps/api/tests/mcp_oauth_state_service.test.ts`

**Step 1: Port discovery, but improve it for `ng`**

Implement the same three-hop discovery used in legacy:
1. request the MCP server URL
2. read `resource_metadata` from `WWW-Authenticate`
3. fetch protected-resource metadata and then authorization-server metadata

Improve the legacy behavior in two places:
- explicitly require the challenge/header contract from the MCP tutorial instead of assuming any successful response is fine
- try RFC 8414 OAuth AS metadata first, then OIDC discovery as a fallback when the provider does not publish `/.well-known/oauth-authorization-server`

**Step 2: Support both DCR and manual client fallback**

Implement client registration so `companyhelm-ng` can:
- use manual client credentials supplied by the user
- call the `registration_endpoint` when DCR is available
- fail clearly when neither DCR nor manual credentials are available

This matches the tutorial’s fallback rule for non-DCR authorization servers.

**Step 3: Create encrypted, user-bound callback state**

Create an `McpOauthStateService` patterned after `GithubInstallationStateService`. The serialized state should carry:
- `sessionId`
- `companyId`
- `organizationSlug`
- `mcpServerId`
- `userId`
- `issuedAt`

Use this encrypted state as the OAuth `state` parameter. Do not rely on a plain random UUID alone as the legacy stack does.

**Step 4: Centralize code exchange**

Create `complete_connection_service.ts` to:
- read and validate encrypted state
- load the pending session
- exchange the authorization code at the token endpoint with PKCE and the `resource` indicator
- persist the resulting connection row and mark the session complete

Keep this out of the GraphQL mutation class so the exchange logic stays testable.

**Step 5: Verify the utility layer**

Run:
- `npm exec -w @companyhelm/api -- vitest run tests/mcp_oauth_discovery.test.ts tests/mcp_oauth_client_registration.test.ts tests/mcp_oauth_state_service.test.ts`

Expected:
- discovery covers `WWW-Authenticate` parsing and metadata fetch failures
- registration covers both DCR and manual credentials
- state service rejects user/company mismatches and malformed payloads

### Task 3: Add start, complete, and disconnect GraphQL mutations

**Files:**
- Create: `apps/api/src/graphql/mutations/start_mcp_server_oauth.ts`
- Create: `apps/api/src/graphql/mutations/complete_mcp_server_oauth.ts`
- Create: `apps/api/src/graphql/mutations/disconnect_mcp_server_oauth.ts`
- Modify: `apps/api/src/graphql/registries/management_graphql_registry.ts`
- Modify: `apps/api/src/graphql/schema/schema.graphql`
- Create: `apps/api/tests/mcp_oauth_graphql.test.ts`

**Step 1: Start the OAuth flow**

Add `StartMcpServerOAuth(input: ...)` that:
- validates the selected MCP server belongs to the authenticated company and uses `authType = oauth`
- discovers metadata
- registers the client dynamically or resolves the manual client
- generates PKCE verifier/challenge
- creates a pending `mcp_oauth_sessions` row
- returns `authorizationUrl`

Recommended input fields:
- `mcpServerId`
- `organizationSlug`
- `oauthClientId`
- `oauthClientSecret`
- `requestedScopes`

**Step 2: Complete the OAuth flow through GraphQL**

Add `CompleteMcpServerOAuth(input: { code, state })` instead of a legacy-style anonymous API callback route.

The mutation should:
- require a signed-in user
- decrypt the callback state
- verify the `userId` from state matches the authenticated user
- resolve the target company from state, not from the currently active org in the Clerk token
- use `AppRuntimeDatabase.withCompanyContext(...)` plus a membership check, following the GitHub install callback pattern
- call the shared completion service and return the updated server or a minimal success payload

This makes the callback consistent with existing `ng` callback handling and avoids landing the user on an API text page.

**Step 3: Add disconnect support**

Add `DisconnectMcpServerOAuth(input: { mcpServerId })` that deletes:
- the current OAuth connection
- any still-pending OAuth sessions for the same MCP server

Do not keep half-complete reconnect sessions around after disconnect.

**Step 4: Return safe errors**

Follow the MCP tutorial’s security guidance:
- do not return raw token payloads, codes, or secrets
- keep browser-visible errors generic
- keep detailed failure context in server logs only, with redaction

**Step 5: Verify the GraphQL flow**

Run:
- `npm exec -w @companyhelm/api -- vitest run tests/mcp_oauth_graphql.test.ts`
- `npm run check -w @companyhelm/api`

Expected:
- start mutation returns a valid authorization URL
- complete mutation rejects mismatched users or companies
- disconnect removes both connection and pending sessions

### Task 4: Replace the header-only web flow with an OAuth-aware UI and callback page

**Files:**
- Modify: `apps/web/src/pages/mcp-servers/mcp_servers_page.tsx`
- Modify: `apps/web/src/pages/mcp-servers/mcp_server_dialog.tsx`
- Modify: `apps/web/src/pages/mcp-servers/mcp_servers_table.tsx`
- Create: `apps/web/src/pages/mcp-servers/mcp_oauth_callback_page.tsx`
- Create: `apps/web/src/pages/mcp-servers/mcp_oauth_callback_search.ts`
- Modify: `apps/web/src/routes.ts`
- Create: `apps/web/tests/mcp_oauth_callback_search.test.ts`
- Modify: `apps/web/tests/mcp_server_headers.test.ts`
- Update generated Relay artifacts under `apps/web/src/pages/mcp-servers/__generated__/`

**Step 1: Add auth mode to the MCP server dialog**

Update the dialog so users can choose:
- `No auth`
- `Custom headers`
- `OAuth`

When `OAuth` is selected, show:
- connection status
- last error
- requested scopes
- manual client id
- manual client secret
- connect/reconnect/disconnect buttons

Do not show the manual client inputs for non-OAuth modes.

**Step 2: Wire the start mutation**

From the MCP servers page:
- pass the current organization slug into `StartMcpServerOAuth`
- redirect the browser with `window.location.assign(result.authorizationUrl)`

Keep the current Relay store updates for create/update/delete intact.

**Step 3: Add a dedicated web callback page**

Create a new authenticated route such as `/mcp/oauth/callback` that:
- reads `code` and `state` from `window.location.search`
- calls `CompleteMcpServerOAuth`
- redirects back to `OrganizationPath.href(organizationSlug, "/mcp-servers")`
- shows a loading state while the mutation is running
- shows a user-safe error state if completion fails

Implement this in the same style as `github_install_callback_page.tsx`.

**Step 4: Surface OAuth status in the table**

Add a small auth/status indicator to `mcp_servers_table.tsx` so the list view makes it obvious whether an OAuth-backed server is connected, degraded, or not connected.

**Step 5: Verify the web app**

Run:
- `npm run check -w @companyhelm/web`
- `npm run build -w @companyhelm/web`
- `npm exec -w @companyhelm/web -- node --import tsx --test tests/mcp_server_headers.test.ts tests/mcp_oauth_callback_search.test.ts`

Expected:
- Relay artifacts are current
- the callback route compiles
- the pure callback parsing helper is covered without adding a new browser test stack

### Task 5: Prepare, but do not fully wire, runtime token usage

**Files:**
- Create: `apps/api/src/services/mcp/oauth/token_refresh.ts`
- Modify: `apps/api/src/services/mcp/service.ts`
- Create: `apps/api/tests/mcp_oauth_token_refresh.test.ts`

**Step 1: Add a runtime-facing accessor**

Add a narrow service method that can resolve the final headers for an OAuth-backed MCP server:
- decrypt the stored token payload
- return a valid `Authorization: Bearer ...` header when the access token is still fresh
- refresh the token when it is expired and a refresh token exists
- mark the connection `degraded` and store `lastError` on refresh failure

**Step 2: Keep session bootstrap out of scope for now**

`companyhelm-ng` still does not activate MCP tool usage inside agent sessions. Do not block this OAuth implementation on PI Mono runtime wiring yet. The goal here is to make the management plane and persisted OAuth state correct first, and leave session/bootstrap consumption as the next parity task.

**Step 3: Match the tutorial’s security requirements**

When refreshing tokens:
- keep tokens encrypted at rest
- keep scopes/resource indicators intact
- never log token values
- always use the MCP `resource` indicator when refreshing

**Step 4: Verify refresh behavior**

Run:
- `npm exec -w @companyhelm/api -- vitest run tests/mcp_oauth_token_refresh.test.ts`

Expected:
- refresh succeeds when the token endpoint returns a new access token
- refresh failures mark the connection degraded without leaking secrets

### Task 6: Final regression pass and commit

**Files:**
- Review all touched files above

**Step 1: Run focused checks**

Run:
- `npm run check -w @companyhelm/api`
- `npm run check -w @companyhelm/web`
- `npm exec -w @companyhelm/api -- vitest run tests/mcp_oauth_migration.test.ts tests/mcp_oauth_discovery.test.ts tests/mcp_oauth_client_registration.test.ts tests/mcp_oauth_state_service.test.ts tests/mcp_oauth_graphql.test.ts tests/mcp_oauth_token_refresh.test.ts`
- `npm exec -w @companyhelm/web -- node --import tsx --test tests/mcp_server_headers.test.ts tests/mcp_oauth_callback_search.test.ts`
- `npm run build -w @companyhelm/web`

Expected:
- API schema, GraphQL, and OAuth utility tests pass
- web page and route compilation pass
- no Relay drift remains

**Step 2: Keep the first implementation boundary clear**

Before merging, confirm the delivered scope is:
- complete OAuth connection management in the catalog
- secure callback handling
- encrypted token persistence
- on-demand token refresh utilities

But not yet:
- PI Mono session bootstrap consumption
- end-to-end agent execution against OAuth-backed MCP servers

**Step 3: Commit**

Run:
- `git add docs/plans/2026-04-11-mcp-oauth-implementation.md`
- `git commit -m "docs: add MCP OAuth implementation plan"`

Expected:
- the plan is captured in-repo and ready for execution in a follow-up session
