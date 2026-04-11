# Guard Credential Deletion With Reassignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent deleting provider credentials that still back agent defaults or persisted sessions unless those references are reassigned first.

**Architecture:** Extend the delete mutation to inspect credential model usage, optionally migrate affected agents and session records onto a replacement credential model, and only then remove the credential. Update the credentials page to surface affected agents, require a usable replacement when the credential is still referenced, and keep the list flow inside a dedicated dialog.

**Tech Stack:** TypeScript, Drizzle ORM, GraphQL/Relay, React, Vitest.

---

### Task 1: Backend Delete Mutation

**Files:**
- Modify: `apps/api/src/graphql/mutations/delete_model_provider_credential.ts`
- Modify: `apps/api/src/graphql/schema/schema.graphql`

**Step 1: Write the failing tests**

- Cover deleting an unused default credential.
- Cover blocking a used credential without replacement.
- Cover reassigning agent defaults and session models before delete.

**Step 2: Implement usage analysis**

- Load the credential before delete.
- Resolve all model rows owned by that credential.
- Collect agents and sessions referencing those model rows.

**Step 3: Implement reassignment**

- Accept `replacementCredentialId` on the delete input.
- Resolve the replacement credential’s default model choice.
- Update affected agents and sessions to the replacement model and a compatible reasoning level.

**Step 4: Preserve default promotion**

- Keep the existing “promote another credential after delete” behavior, but only after the delete is valid.

### Task 2: API Tests

**Files:**
- Modify: `apps/api/tests/delete_model_provider_credential_mutation.test.ts`

**Step 1: Replace the current shallow delete test with a focused mutation harness**

- Exercise the mutation directly with deterministic in-memory rows.

**Step 2: Verify the three core cases**

- Unused delete succeeds.
- In-use delete without replacement fails with a helpful message.
- Replacement delete updates agents and sessions, then deletes the credential.

### Task 3: Web Delete Flow

**Files:**
- Create: `apps/web/src/pages/model-provider-credentials/delete_credential_dialog.tsx`
- Modify: `apps/web/src/pages/model-provider-credentials/credentials_table.tsx`
- Modify: `apps/web/src/pages/model-provider-credentials/model_provider_credentials_page.tsx`
- Modify: `apps/web/src/pages/model-provider-credentials/__generated__/*.graphql.ts`

**Step 1: Expand the page query**

- Fetch `Agents`, `AgentCreateOptions`, and `Sessions` so the page can compute affected agents, session counts, and valid replacement credentials.

**Step 2: Replace the alert dialog with a dedicated delete dialog**

- Show the credential name.
- List affected agents.
- Mention existing session count when present.
- Require a replacement credential only when usage exists.

**Step 3: Keep table navigation stable**

- Ignore portal-originated dialog/select clicks so choosing a replacement does not navigate to the credential detail page.

### Task 4: Verification

**Files:**
- Modify only if generated outputs require it.

**Step 1: Install dependencies in the worktree if needed**

- Run: `npm install`

**Step 2: Regenerate Relay artifacts**

- Run: `npm run relay -w @companyhelm/web`

**Step 3: Run focused verification**

- Run: `npm exec -w @companyhelm/api -- vitest run tests/delete_model_provider_credential_mutation.test.ts`
- Run: `npm run check -w @companyhelm/web`

**Step 4: Commit and merge back**

- Commit the feature branch after verification.
- Merge the worktree branch back into the main worktree and remove the worktree.
