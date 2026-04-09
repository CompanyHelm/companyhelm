import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentSessionEnvironment } from "../src/services/environments/session_environment.ts";

test("AgentSessionEnvironment merges attached session secrets into executeCommand environment", async () => {
  const executionInputs: Array<Record<string, unknown>> = [];
  const directShellCalls: Array<{
    command: string;
    environment?: Record<string, string>;
    timeoutSeconds?: number;
    workingDirectory?: string;
  }> = [];
  const environment = new AgentSessionEnvironment(
    {} as never,
    "company-123",
    "session-1",
    {
      agentId: "agent-1",
      companyId: "company-123",
      cpuCount: 2,
      createdAt: new Date(),
      diskSpaceGb: 20,
      displayName: null,
      id: "environment-1",
      lastSeenAt: null,
      memoryGb: 4,
      metadata: {},
      platform: "linux",
      provider: "e2b",
      providerDefinitionId: "compute-provider-definition-1",
      providerEnvironmentId: "sandbox-1",
      templateId: "medium",
      updatedAt: new Date(),
    },
    {
      async markLeaseIdle() {
        return undefined;
      },
      async heartbeatLease() {
        return undefined;
      },
    } as never,
    {
      async resolveSessionEnvironmentVariables(
        _transactionProvider: unknown,
        companyId: string,
        sessionId: string,
      ) {
        assert.equal(companyId, "company-123");
        assert.equal(sessionId, "session-1");

        return {
          API_KEY: "secret-value",
          SHARED_VAR: "from-secret",
        };
      },
    } as never,
    {
      async executeCommand(
        command: string,
        workingDirectory?: string,
        environment?: Record<string, string>,
        timeoutSeconds?: number,
      ) {
        directShellCalls.push({
          command,
          environment,
          timeoutSeconds,
          workingDirectory,
        });
        return {
          exitCode: 0,
          stdout: "direct-ok",
        };
      },
    } as never,
    {
      async dispose() {
        return undefined;
      },
      async executeCommand(input: Record<string, unknown>) {
        executionInputs.push(input as unknown as Record<string, unknown>);
        return {
          completed: true,
          exitCode: 0,
          output: "ok",
          ptyId: "workspace",
          sessionId: null,
        };
      },
      async killPty() {
        return undefined;
      },
      async listPtys() {
        return [];
      },
      async readOutput() {
        return {
          chunks: [],
          nextOffset: null,
        };
      },
      async resizePty() {
        return undefined;
      },
      async sendInput() {
        return {
          completed: true,
          exitCode: 0,
          output: "",
          ptyId: "workspace",
          sessionId: null,
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
    ptyId: "workspace",
  });

  assert.equal(result.output, "ok");
  assert.deepEqual(executionInputs, [{
    command: "printenv API_KEY",
    environment: {
      API_KEY: "secret-value",
      SHARED_VAR: "from-command",
      USER_VAR: "user-value",
    },
    ptyId: "workspace",
  }]);

  const directResult = await environment.executeBashCommand({
    command: "echo \"$API_KEY\"",
    environment: {
      SHARED_VAR: "from-direct-command",
      USER_VAR: "direct-user-value",
    },
    timeoutSeconds: 15,
    workingDirectory: "/workspace",
  });

  assert.deepEqual(directResult, {
    exitCode: 0,
    output: "direct-ok",
  });
  assert.deepEqual(directShellCalls, [{
    command: 'bash -lc \'echo "$API_KEY"\'',
    environment: {
      API_KEY: "secret-value",
      SHARED_VAR: "from-direct-command",
      USER_VAR: "direct-user-value",
    },
    timeoutSeconds: 15,
    workingDirectory: "/workspace",
  }]);

  await environment.dispose();
});
