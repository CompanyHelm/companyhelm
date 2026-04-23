import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type ToolCallSummaryRecord,
  resolveGithubInstallationStartTurnActions,
  resolveGithubInstallationStartToolResult,
  resolvePrincipalExecutionMessageDisplay,
  resolveSessionTitleOverride,
  shouldHydrateComposerSelection,
} from "../src/pages/chats/chats_page_helpers";
import type { SessionMessageRecord } from "../src/pages/chats/chats_page_data";
import type { SessionRecord } from "../src/pages/chats/chats_page_data";

function makeToolResultMessage(
  text: string,
  overrides: Partial<Pick<SessionMessageRecord, "id" | "toolCallId">> = {},
): SessionMessageRecord {
  return {
    contents: [{
      text,
      type: "text",
    }],
    id: overrides.id ?? "message-1",
    isError: false,
    role: "toolResult",
    status: "completed",
    toolCallId: overrides.toolCallId ?? "tool-call-1",
    toolName: "system_command",
  } as unknown as SessionMessageRecord;
}

function makeToolCallSummary(
  argumentsValue: ToolCallSummaryRecord["argumentsValue"],
): ToolCallSummaryRecord {
  return {
    argumentsText: null,
    argumentsValue,
    toolName: "system_command",
  };
}

test("shouldHydrateComposerSelection returns true when the chat target changes", () => {
  const modelOptionById = new Map([["model-a", { id: "model-a" }]]);

  assert.equal(
    shouldHydrateComposerSelection(
      "agent-1:session-1",
      "agent-1:session-2",
      "model-a",
      modelOptionById as ReadonlyMap<string, { id: string }>,
    ),
    true,
  );
});

test("shouldHydrateComposerSelection returns false for streaming updates on the same chat target", () => {
  const modelOptionById = new Map([["model-a", { id: "model-a" }]]);

  assert.equal(
    shouldHydrateComposerSelection(
      "agent-1:session-1",
      "agent-1:session-1",
      "model-a",
      modelOptionById as ReadonlyMap<string, { id: string }>,
    ),
    false,
  );
});

test("shouldHydrateComposerSelection returns true when the current model is no longer available", () => {
  const modelOptionById = new Map([["model-a", { id: "model-a" }]]);

  assert.equal(
    shouldHydrateComposerSelection(
      "agent-1:session-1",
      "agent-1:session-1",
      "missing-model",
      modelOptionById as ReadonlyMap<string, { id: string }>,
    ),
    true,
  );
});

test("resolveSessionTitleOverride prefers the associated task name for task chats", () => {
  assert.equal(
    resolveSessionTitleOverride(
      {
        associatedTask: {
          id: "task-1",
          name: "Prepare launch brief",
          status: "open",
        },
        id: "session-1",
        inferredTitle: "Session-generated title",
        userSetTitle: "User-set title",
      },
      {
        "session-1": "Optimistic title",
      },
    ),
    "Prepare launch brief",
  );
});

test("resolveSessionTitleOverride keeps session fallback titles when no task is associated", () => {
  assert.equal(
    resolveSessionTitleOverride(
      {
        associatedTask: null,
        id: "session-2",
        inferredTitle: null,
        userSetTitle: null,
      },
      {
        "session-2": "Optimistic session title",
      },
    ),
    "Optimistic session title",
  );
});

test("resolveGithubInstallationStartToolResult resolves a GitHub install system command result", () => {
  const result = resolveGithubInstallationStartToolResult(
    makeToolResultMessage(JSON.stringify({
      installationUrl: "https://github.com/apps/companyhelm/installations/new?state=signed-state",
      returnPath: "/orgs/acme/chats?agentId=agent-1&sessionId=session-1",
      sourceSessionId: "session-1",
      status: "waiting_for_user",
    })),
    makeToolCallSummary({ id: "github.installation.start" }),
  );

  assert.deepEqual(result, {
    installationUrl: "https://github.com/apps/companyhelm/installations/new?state=signed-state",
    returnPath: "/orgs/acme/chats?agentId=agent-1&sessionId=session-1",
    sourceSessionId: "session-1",
    status: "waiting_for_user",
  });
});

test("resolveGithubInstallationStartToolResult ignores other system commands", () => {
  const result = resolveGithubInstallationStartToolResult(
    makeToolResultMessage(JSON.stringify({
      installationUrl: "https://github.com/apps/companyhelm/installations/new?state=signed-state",
      status: "waiting_for_user",
    })),
    makeToolCallSummary({ id: "github.installation.list" }),
  );

  assert.equal(result, null);
});

test("resolveGithubInstallationStartToolResult rejects non-http install urls", () => {
  const result = resolveGithubInstallationStartToolResult(
    makeToolResultMessage(JSON.stringify({
      installationUrl: "javascript:alert(1)",
      status: "waiting_for_user",
    })),
    makeToolCallSummary({ id: "github.installation.start" }),
  );

  assert.equal(result, null);
});

test("resolveGithubInstallationStartTurnActions promotes install command results into turn actions", () => {
  const message = makeToolResultMessage(JSON.stringify({
    installationUrl: "https://github.com/apps/companyhelm/installations/new?state=signed-state",
    returnPath: "/orgs/acme/chats?agentId=agent-1&sessionId=session-1",
    sourceSessionId: "session-1",
    status: "waiting_for_user",
  }), {
    id: "message-install",
    toolCallId: "tool-call-install",
  });
  const actions = resolveGithubInstallationStartTurnActions(
    [message],
    new Map([[
      "tool-call-install",
      makeToolCallSummary({ id: "github.installation.start" }),
    ]]),
  );

  assert.deepEqual(actions, [{
    installationUrl: "https://github.com/apps/companyhelm/installations/new?state=signed-state",
    isError: false,
    messageId: "message-install",
    returnPath: "/orgs/acme/chats?agentId=agent-1&sessionId=session-1",
    sourceSessionId: "session-1",
    status: "waiting_for_user",
    toolCallId: "tool-call-install",
  }]);
});

test("resolveGithubInstallationStartTurnActions skips install results without the source tool call", () => {
  const actions = resolveGithubInstallationStartTurnActions(
    [makeToolResultMessage(JSON.stringify({
      installationUrl: "https://github.com/apps/companyhelm/installations/new?state=signed-state",
      status: "waiting_for_user",
    }))],
    new Map(),
  );

  assert.deepEqual(actions, []);
});

test("resolvePrincipalExecutionMessageDisplay formats task execution user messages", () => {
  const display = resolvePrincipalExecutionMessageDisplay(
    {
      principalType: "task",
      role: "user",
      taskRunId: "task-run-1",
    } as unknown as SessionMessageRecord,
    {
      associatedTask: {
        id: "task-1",
        name: "Prepare launch brief",
        status: "in_progress",
      },
    } as unknown as SessionRecord,
  );

  assert.deepEqual(display, {
    detailLabel: "Task run task-run-1",
    executionType: "task",
    statusLabel: "in_progress",
    summaryLabel: "Prepare launch brief",
    title: "Execute task",
  });
});

test("resolvePrincipalExecutionMessageDisplay formats workflow execution user messages", () => {
  const display = resolvePrincipalExecutionMessageDisplay(
    {
      principalType: "workflow",
      role: "user",
      workflowRunId: "workflow-run-1",
    } as unknown as SessionMessageRecord,
    {
      associatedWorkflowRun: {
        id: "workflow-run-1",
        name: "Ship release",
        status: "running",
        steps: [{
          id: "step-1",
          name: "Build",
          ordinal: 1,
          status: "done",
          workflowRunId: "workflow-run-1",
        }, {
          id: "step-2",
          name: "Deploy",
          ordinal: 2,
          status: "pending",
          workflowRunId: "workflow-run-1",
        }],
      },
    } as unknown as SessionRecord,
  );

  assert.deepEqual(display, {
    detailLabel: "Workflow run workflow-run-1",
    executionType: "workflow",
    statusLabel: "running · 1/2",
    summaryLabel: "Ship release",
    title: "Execute workflow",
  });
});
