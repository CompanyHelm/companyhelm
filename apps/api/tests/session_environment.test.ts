import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentSessionEnvironment } from "../src/services/agent/environment/session_environment.ts";

test("AgentSessionEnvironment merges attached session secrets into executeCommand environment", async () => {
  const executionInputs: Array<Record<string, unknown>> = [];
  const environment = new AgentSessionEnvironment(
    {} as never,
    "company-123",
    "session-1",
    {
      async markLeaseIdle() {
        return undefined;
      },
      async heartbeatLease() {
        return undefined;
      },
    } as never,
    {
      async resolveSessionEnvironmentVariables(_transactionProvider, companyId: string, sessionId: string) {
        assert.equal(companyId, "company-123");
        assert.equal(sessionId, "session-1");

        return {
          API_KEY: "secret-value",
          SHARED_VAR: "from-secret",
        };
      },
    } as never,
    {
      async closeSession() {
        return undefined;
      },
      async dispose() {
        return undefined;
      },
      async executeCommand(input) {
        executionInputs.push(input as unknown as Record<string, unknown>);
        return {
          completed: true,
          exitCode: 0,
          output: "ok",
          sessionId: "main",
        };
      },
      async killSession() {
        return undefined;
      },
      async listSessions() {
        return [];
      },
      async readOutput() {
        return {
          chunks: [],
          nextOffset: null,
        };
      },
      async resizeSession() {
        return undefined;
      },
      async sendInput() {
        return {
          completed: true,
          exitCode: 0,
          output: "",
          sessionId: "main",
        };
      },
    } as never,
    "lease-1",
    "owner-token-1",
  );

  const result = await environment.executeCommand({
    command: "printenv API_KEY",
    environment: {
      SHARED_VAR: "from-command",
      USER_VAR: "user-value",
    },
  });

  assert.equal(result.output, "ok");
  assert.deepEqual(executionInputs, [{
    command: "printenv API_KEY",
    environment: {
      API_KEY: "secret-value",
      SHARED_VAR: "from-command",
      USER_VAR: "user-value",
    },
  }]);

  await environment.dispose();
});
