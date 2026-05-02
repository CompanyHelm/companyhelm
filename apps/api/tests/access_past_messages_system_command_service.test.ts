import assert from "node:assert/strict";
import { test } from "vitest";
import { AccessPastMessagesSystemCommandService } from "../src/services/system_commands/access_past_messages.ts";

const context = {
  agentId: "agent-1",
  companyId: "company-123",
  sessionId: "session-current",
  transactionProvider: "transaction-provider",
} as never;

test("AccessPastMessagesSystemCommandService lists messages with content filters", async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new AccessPastMessagesSystemCommandService({
    async listMessages(_transactionProvider: unknown, input: Record<string, unknown>) {
      capturedInput = input;
      return {
        messages: [{
          id: "message-1",
          sessionId: "session-1",
          turnId: "turn-1",
          role: "assistant",
          status: "completed",
          toolCallId: null,
          toolName: null,
          principalAgentId: null,
          principalSessionId: null,
          principalType: "user",
          taskRunId: null,
          workflowRunId: null,
          isError: false,
          errorMessage: null,
          createdAt: new Date("2026-05-02T10:00:00.000Z"),
          updatedAt: new Date("2026-05-02T10:01:00.000Z"),
          contents: [{
            id: "content-1",
            messageId: "message-1",
            type: "text",
            text: "hello",
            data: null,
            mimeType: null,
            structuredContent: null,
            toolCallId: null,
            toolName: null,
            arguments: null,
            createdAt: new Date("2026-05-02T10:00:00.000Z"),
            updatedAt: new Date("2026-05-02T10:00:00.000Z"),
          }],
        }],
        nextCursor: "cursor-1",
      };
    },
  } as never);

  const result = await service.execute("past_messages.list", {
    contentTypes: ["text"],
    includeContents: true,
    limit: 10,
    roles: ["assistant"],
    sessionId: "session-1",
    sort: "desc",
  }, context);

  assert.deepEqual(capturedInput, {
    after: undefined,
    agentId: "agent-1",
    before: undefined,
    companyId: "company-123",
    contentTypes: ["text"],
    cursor: undefined,
    includeContents: true,
    limit: 10,
    principalTypes: undefined,
    roles: ["assistant"],
    sessionId: "session-1",
    sort: "desc",
    statuses: undefined,
  });
  assert.deepEqual(result, {
    messages: [{
      id: "message-1",
      sessionId: "session-1",
      turnId: "turn-1",
      role: "assistant",
      status: "completed",
      toolCallId: null,
      toolName: null,
      principalAgentId: null,
      principalSessionId: null,
      principalType: "user",
      taskRunId: null,
      workflowRunId: null,
      isError: false,
      errorMessage: null,
      createdAt: "2026-05-02T10:00:00.000Z",
      updatedAt: "2026-05-02T10:01:00.000Z",
      contents: [{
        id: "content-1",
        messageId: "message-1",
        type: "text",
        text: "hello",
        data: null,
        mimeType: null,
        structuredContent: null,
        toolCallId: null,
        toolName: null,
        arguments: null,
        createdAt: "2026-05-02T10:00:00.000Z",
        updatedAt: "2026-05-02T10:00:00.000Z",
      }],
    }],
    nextCursor: "cursor-1",
  });
});

test("AccessPastMessagesSystemCommandService gets one message with requested content types", async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new AccessPastMessagesSystemCommandService({
    async getMessage(_transactionProvider: unknown, input: Record<string, unknown>) {
      capturedInput = input;
      return {
        id: "message-1",
        sessionId: "session-1",
        turnId: "turn-1",
        role: "toolResult",
        status: "completed",
        toolCallId: "tool-call-1",
        toolName: "bash_exec",
        principalAgentId: "agent-1",
        principalSessionId: "session-current",
        principalType: "agent_message",
        taskRunId: null,
        workflowRunId: null,
        isError: false,
        errorMessage: null,
        createdAt: new Date("2026-05-02T11:00:00.000Z"),
        updatedAt: new Date("2026-05-02T11:00:30.000Z"),
        contents: [],
      };
    },
  } as never);

  const result = await service.execute("past_messages.get", {
    contentTypes: ["toolCall"],
    includeContents: false,
    messageId: "message-1",
  }, context);

  assert.deepEqual(capturedInput, {
    agentId: "agent-1",
    companyId: "company-123",
    contentTypes: ["toolCall"],
    includeContents: false,
    messageId: "message-1",
  });
  assert.equal((result.message as Record<string, unknown>).id, "message-1");
  assert.equal((result.message as Record<string, unknown>).createdAt, "2026-05-02T11:00:00.000Z");
});

test("AccessPastMessagesSystemCommandService searches message content", async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new AccessPastMessagesSystemCommandService({
    async searchMessages(_transactionProvider: unknown, input: Record<string, unknown>) {
      capturedInput = input;
      return {
        messages: [],
        nextCursor: null,
      };
    },
  } as never);

  await service.execute("past_messages.search", {
    contentTypes: ["text"],
    includeContents: true,
    query: "deploy",
  }, context);

  assert.deepEqual(capturedInput, {
    after: undefined,
    agentId: "agent-1",
    before: undefined,
    companyId: "company-123",
    contentTypes: ["text"],
    cursor: undefined,
    includeContents: true,
    limit: undefined,
    principalTypes: undefined,
    query: "deploy",
    roles: undefined,
    sessionId: undefined,
    sort: undefined,
    statuses: undefined,
  });
});
