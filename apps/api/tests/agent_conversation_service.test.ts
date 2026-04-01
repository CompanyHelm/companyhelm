import assert from "node:assert/strict";
import { test } from "vitest";
import { agentConversationMessages, agentConversationParticipants, agentConversations } from "../src/db/schema.ts";
import { AgentConversationService } from "../src/services/agent/conversations/service.ts";

class AgentConversationServiceTestTransaction {
  readonly insertCalls: Array<{ table: unknown; values: unknown }> = [];
  readonly updateCalls: Array<{ table: unknown; values: unknown }> = [];
  private readonly selectResponses: Array<Array<Record<string, unknown>>>;

  constructor(selectResponses: Array<Array<Record<string, unknown>>>) {
    this.selectResponses = [...selectResponses];
  }

  select() {
    return {
      from: (table: unknown) => {
        void table;
        return {
          where: async (condition: unknown) => {
            void condition;
            return this.selectResponses.shift() ?? [];
          },
        };
      },
    };
  }

  insert(table: unknown) {
    return {
      values: async (values: unknown) => {
        this.insertCalls.push({
          table,
          values,
        });
        return undefined;
      },
    };
  }

  update(table: unknown) {
    return {
      set: (values: unknown) => {
        return {
          where: async (condition: unknown) => {
            void condition;
            this.updateCalls.push({
              table,
              values,
            });
            return undefined;
          },
        };
      },
    };
  }
}

test("AgentConversationService queues a steer delivery for an explicit target session", async () => {
  const transaction = new AgentConversationServiceTestTransaction([
    [{ agentId: "agent-1", id: "session-1", status: "running" }],
    [{ id: "agent-1", name: "Manager" }],
    [{ agentId: "agent-2", id: "session-2", status: "running" }],
    [],
  ]);
  const queuePromptCalls: Array<Record<string, unknown>> = [];
  const notifyCalls: Array<Record<string, unknown>> = [];
  const service = new AgentConversationService(
    {
      child() {
        return {
          info() {
            return undefined;
          },
        };
      },
    } as never,
    {
      async createSessionInTransaction() {
        throw new Error("new target sessions should not be created for explicit session routing");
      },
      async notifyQueuedSessionMessage(companyId: string, sessionId: string, shouldSteer: boolean) {
        notifyCalls.push({
          companyId,
          sessionId,
          shouldSteer,
        });
      },
      async queuePromptInTransaction(
        _selectableDatabase: unknown,
        _insertableDatabase: unknown,
        _updatableDatabase: unknown,
        companyId: string,
        sessionId: string,
        text: string,
        options: Record<string, unknown>,
      ) {
        queuePromptCalls.push({
          companyId,
          options,
          sessionId,
          text,
        });
        return {
          currentContextTokens: null,
          currentModelId: "gpt-5.4",
          currentModelProviderCredentialModelId: "model-1",
          currentReasoningLevel: "high",
          id: sessionId,
          agentId: "agent-2",
          inferredTitle: null,
          isCompacting: false,
          isThinking: false,
          maxContextTokens: null,
          status: "queued",
          thinkingText: null,
          createdAt: new Date("2026-03-31T10:00:00.000Z"),
          updatedAt: new Date("2026-03-31T10:00:00.000Z"),
          userSetTitle: null,
        };
      },
    } as never,
  );

  const result = await service.sendMessage({
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(transaction as never),
  } as never, {
    companyId: "company-1",
    sourceAgentId: "agent-1",
    sourceSessionId: "session-1",
    targetSessionId: "session-2",
    text: "Can you review the migration?",
  });

  assert.equal(result.targetAgentId, "agent-2");
  assert.equal(result.targetSessionId, "session-2");
  assert.equal(result.createdNewTargetSession, false);
  assert.equal(queuePromptCalls.length, 1);
  assert.equal(queuePromptCalls[0]?.sessionId, "session-2");
  assert.equal((queuePromptCalls[0]?.options as { shouldSteer: boolean }).shouldSteer, true);
  assert.match(String(queuePromptCalls[0]?.text), /Reply target session id: session-1/);
  assert.equal(notifyCalls.length, 1);
  assert.deepEqual(notifyCalls[0], {
    companyId: "company-1",
    sessionId: "session-2",
    shouldSteer: true,
  });
  assert.equal(transaction.insertCalls.length, 3);
  assert.equal(transaction.insertCalls[0]?.table, agentConversations);
  assert.equal(transaction.insertCalls[1]?.table, agentConversationParticipants);
  assert.equal(transaction.insertCalls[2]?.table, agentConversationMessages);
});

test("AgentConversationService creates a new target session when targeting an agent with no reusable conversation", async () => {
  const transaction = new AgentConversationServiceTestTransaction([
    [{ agentId: "agent-1", id: "session-1", status: "running" }],
    [{ id: "agent-1", name: "Manager" }],
    [{ id: "agent-2", name: "Research Agent" }],
    [],
    [],
    [],
  ]);
  const createSessionCalls: Array<Record<string, unknown>> = [];
  const notifyCalls: Array<Record<string, unknown>> = [];
  const service = new AgentConversationService(
    {
      child() {
        return {
          info() {
            return undefined;
          },
        };
      },
    } as never,
    {
      async createSessionInTransaction(
        _selectableDatabase: unknown,
        _insertableDatabase: unknown,
        companyId: string,
        agentId: string,
        userMessage: string,
      ) {
        createSessionCalls.push({
          agentId,
          companyId,
          userMessage,
        });
        return {
          currentContextTokens: null,
          currentModelId: "gpt-5.4",
          currentModelProviderCredentialModelId: "model-2",
          currentReasoningLevel: "high",
          id: "session-2",
          agentId,
          inferredTitle: userMessage.slice(0, 50),
          isCompacting: false,
          isThinking: false,
          maxContextTokens: null,
          status: "queued",
          thinkingText: null,
          createdAt: new Date("2026-03-31T10:05:00.000Z"),
          updatedAt: new Date("2026-03-31T10:05:00.000Z"),
          userSetTitle: null,
        };
      },
      async notifyQueuedSessionMessage(companyId: string, sessionId: string, shouldSteer: boolean) {
        notifyCalls.push({
          companyId,
          sessionId,
          shouldSteer,
        });
      },
      async queuePromptInTransaction() {
        throw new Error("existing target sessions should not be reused when no conversation exists");
      },
    } as never,
  );

  const result = await service.sendMessage({
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(transaction as never),
  } as never, {
    companyId: "company-1",
    sourceAgentId: "agent-1",
    sourceSessionId: "session-1",
    targetAgentId: "agent-2",
    text: "Research the rollout blockers.",
  });

  assert.equal(result.targetAgentId, "agent-2");
  assert.equal(result.targetSessionId, "session-2");
  assert.equal(result.createdNewTargetSession, true);
  assert.equal(createSessionCalls.length, 1);
  assert.equal(createSessionCalls[0]?.agentId, "agent-2");
  assert.match(String(createSessionCalls[0]?.userMessage), /Research the rollout blockers/);
  assert.equal(notifyCalls.length, 1);
  assert.deepEqual(notifyCalls[0], {
    companyId: "company-1",
    sessionId: "session-2",
    shouldSteer: false,
  });
});
