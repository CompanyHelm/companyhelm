import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentGithubExecTool } from "../src/services/agent/session/pi-mono/tools/github/exec.ts";
import { AgentGithubToolProvider } from "../src/services/agent/session/pi-mono/tools/github/provider.ts";
import { AgentListGithubInstallationsTool } from "../src/services/agent/session/pi-mono/tools/github/list_installations.ts";

type ToolExecuteFunction = (toolCallId: string, params: unknown) => Promise<{
  content: Array<{ text: string; type: string }>;
  details?: Record<string, unknown>;
}>;

test("AgentGithubToolProvider contributes the GitHub installation and gh exec tools", () => {
  const provider = new AgentGithubToolProvider({
    async getEnvironment() {
      throw new Error("environment access is lazy");
    },
  } as never, {
    async getInstallationAccessToken() {
      throw new Error("installation tokens are lazy");
    },
    async listInstallations() {
      throw new Error("installation listing is lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["list_github_installations", "gh_exec"],
  );
});

test("AgentListGithubInstallationsTool renders linked installations and repository lists", async () => {
  const tool = new AgentListGithubInstallationsTool({
    async listInstallations() {
      return [{
        createdAt: new Date("2026-03-29T12:00:00.000Z"),
        installationId: 110600868,
        repositories: [{
          archived: false,
          defaultBranch: "main",
          fullName: "acme/repo-one",
          htmlUrl: "https://github.com/acme/repo-one",
          installationId: 110600868,
          isPrivate: true,
          name: "repo-one",
        }],
      }];
    },
  } as never);
  const definition = tool.createDefinition() as unknown as {
    execute: ToolExecuteFunction;
  };

  const result = await definition.execute("tool-call-1", {});

  assert.deepEqual(result, {
    content: [{
      text: [
        "installationId: 110600868",
        "createdAt: 2026-03-29T12:00:00.000Z",
        "repositories:",
        "- acme/repo-one",
      ].join("\n"),
      type: "text",
    }],
  });
});

test("AgentGithubExecTool injects the installation access token only into the command execution environment", async () => {
  const executeCommand = vi.fn(async (input: Record<string, unknown>) => {
    void input;
    return {
      completed: true,
      exitCode: 0,
      output: "acme/repo-one\n",
      sessionId: "pty-123",
    };
  });
  const tool = new AgentGithubExecTool({
    async getEnvironment() {
      return {
        executeCommand,
      };
    },
  } as never, {
    async getInstallationAccessToken() {
      return "ghs_installation_token";
    },
  } as never);
  const definition = tool.createDefinition() as unknown as {
    execute: ToolExecuteFunction;
  };

  const result = await definition.execute("tool-call-1", {
    args: ["repo", "list", "acme"],
    installationId: "110600868",
    keepSession: true,
    sessionId: "pty-existing",
    workingDirectory: "/workspace/repo",
    yield_time_ms: 250,
  });

  assert.equal(executeCommand.mock.calls.length, 1);
  assert.deepEqual(executeCommand.mock.calls[0]?.[0], {
    columns: undefined,
    command: "command -v gh >/dev/null 2>&1 || (apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y gh); gh 'repo' 'list' 'acme'",
    environment: {
      GH_TOKEN: "ghs_installation_token",
    },
    keepSession: true,
    rows: undefined,
    sessionId: "pty-existing",
    workingDirectory: "/workspace/repo",
    yield_time_ms: 250,
  });
  assert.deepEqual(result, {
    content: [{
      text: "acme/repo-one",
      type: "text",
    }],
    details: {
      command: "gh 'repo' 'list' 'acme'",
      completed: true,
      cwd: "/workspace/repo",
      exitCode: 0,
      installationId: 110600868,
      sessionId: "pty-123",
    },
  });
});

test("AgentGithubExecTool rejects gh auth commands", async () => {
  const tool = new AgentGithubExecTool({
    async getEnvironment() {
      throw new Error("environment should not be reached");
    },
  } as never, {
    async getInstallationAccessToken() {
      throw new Error("token resolution should not be reached");
    },
  } as never);
  const definition = tool.createDefinition() as unknown as {
    execute: ToolExecuteFunction;
  };

  await assert.rejects(
    definition.execute("tool-call-1", {
      args: ["auth", "status"],
      installationId: "110600868",
    }),
    /gh auth commands are not allowed/,
  );
});
