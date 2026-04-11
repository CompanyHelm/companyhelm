# Conversation Service Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the conversation service into dedicated command, query, and delivery-planning classes without changing its external API.

**Architecture:** Keep `AgentConversationService` as the public facade so existing imports and DI consumers stay stable. Move send-message orchestration into `AgentConversationCommandService`, read-side conversation/message hydration into `AgentConversationQueryService`, and session/conversation resolution plus delivery planning into `ConversationDeliveryPlanner`.

**Tech Stack:** TypeScript, Inversify, Drizzle ORM, Vitest

---

### Task 1: Establish the safe implementation baseline

**Files:**
- Verify: `apps/api/package.json`
- Verify: `apps/api/tests/agent_conversation_service.test.ts`
- Verify: `apps/api/tests/agent_conversation_tools.test.ts`

**Step 1: Install worktree dependencies if needed**

Run: `npm install`
Expected: workspace dependencies install successfully in the worktree.

**Step 2: Run the focused baseline verification**

Run: `npm run test -w @companyhelm/api -- agent_conversation_service.test.ts agent_conversation_tools.test.ts`
Expected: the current conversation service tests pass before refactoring begins.

### Task 2: Split the service into focused classes

**Files:**
- Modify: `apps/api/src/services/conversations/service.ts`
- Create: `apps/api/src/services/conversations/command_service.ts`
- Create: `apps/api/src/services/conversations/query_service.ts`
- Create: `apps/api/src/services/conversations/delivery_planner.ts`

**Step 1: Create the delivery planner**

Move delivery prompt rendering, target session reuse heuristics, and conversation/session resolution helpers into a dedicated planner class with class-level documentation.

**Step 2: Create the command service**

Move `sendMessage` orchestration and command-side validation into a dedicated command class that composes the delivery planner and preserves existing behavior.

**Step 3: Create the query service**

Move `listConversations`, `listMessages`, pagination/order handling, latest-message selection, and participant/session hydration into a read-side class.

**Step 4: Reduce the existing service to a facade**

Keep the current exported public types and `AgentConversationService` class in `service.ts`, but delegate its methods to the new command/query classes so downstream imports do not change.

### Task 3: Update tests for the new internal structure

**Files:**
- Modify: `apps/api/tests/agent_conversation_service.test.ts`

**Step 1: Keep the behavioral tests green**

Update test setup only where constructor dependencies change so the assertions continue to validate send, list, and hydration behavior through the public facade.

**Step 2: Add focused coverage if the split introduces a gap**

Add a targeted assertion only if needed to cover delegation or planner behavior that is no longer exercised by the existing tests.

### Task 4: Verify and ship the refactor

**Files:**
- Verify: `apps/api/src/services/conversations/service.ts`
- Verify: `apps/api/src/services/conversations/command_service.ts`
- Verify: `apps/api/src/services/conversations/query_service.ts`
- Verify: `apps/api/src/services/conversations/delivery_planner.ts`
- Verify: `apps/api/tests/agent_conversation_service.test.ts`

**Step 1: Run the focused verification**

Run: `npm run test -w @companyhelm/api -- agent_conversation_service.test.ts agent_conversation_tools.test.ts`
Expected: the conversation-focused API tests pass after the split.

**Step 2: Run the API static checks**

Run: `npm run check -w @companyhelm/api`
Expected: lint and typecheck succeed with the new class split.

**Step 3: Commit**

Run:

```bash
git add docs/plans/2026-04-10-conversation-service-split.md apps/api/src/services/conversations apps/api/tests/agent_conversation_service.test.ts
git commit -m "refactor: split conversation service"
```

Expected: one commit containing the refactor and its verification-related test updates.
