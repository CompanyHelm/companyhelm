import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentGithubCloneRepositoryTool } from "../src/services/agent/session/pi-mono/tools/github/clone_repository.ts";
import { AgentGithubExecTool } from "../src/services/agent/session/pi-mono/tools/github/exec.ts";
import { AgentGithubToolProvider } from "../src/services/agent/session/pi-mono/tools/github/provider.ts";
import { AgentListGithubInstallationsTool } from "../src/services/agent/session/pi-mono/tools/github/list_installations.ts";

type ToolExecuteFunction = (toolCallId: string, params: unknown) => Promise<{
  content: Array<{ text: string; type: string }>;
  details?: Record<string, unknown>;
}>;

test("AgentGithubToolProvider contributes the GitHub installation, clone, and gh exec tools", () => {
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
    ["list_github_installations", "clone_github_repository", "gh_exec"],
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

test("AgentGithubCloneRepositoryTool clones with installation-backed git auth without exposing the token", async () => {
  const executeCommand = vi.fn(async (input: Record<string, unknown>) => {
    void input;
    return {
      completed: true,
      exitCode: 0,
      output: "Cloning into 'companyhelm-ng'...\n",
      sessionId: null,
    };
  });
  const tool = new AgentGithubCloneRepositoryTool({
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
    installationId: "110600868",
    repository: "CompanyHelm/companyhelm-ng",
    workingDirectory: "~/workspace",
    yield_time_ms: 20_000,
  });

  assert.equal(executeCommand.mock.calls.length, 1);
  assert.deepEqual(executeCommand.mock.calls[0]?.[0], {
    command: "AUTH_HEADER=$(printf '%s' \"x-access-token:${GITHUB_INSTALLATION_TOKEN}\" | base64 | tr -d '\\n') && git -c credential.helper= -c http.https://github.com/.extraheader=\"AUTHORIZATION: basic ${AUTH_HEADER}\" clone -- 'https://github.com/CompanyHelm/companyhelm-ng.git' 'companyhelm-ng'",
    environment: {
      GH_PROMPT_DISABLED: "1",
      GITHUB_INSTALLATION_TOKEN: "ghs_installation_token",
      GIT_TERMINAL_PROMPT: "0",
    },
    workingDirectory: "~/workspace",
    yield_time_ms: 20_000,
  });
  assert.deepEqual(result, {
    content: [{
      text: "Cloning into 'companyhelm-ng'...",
      type: "text",
    }],
    details: {
      command: "git clone 'https://github.com/CompanyHelm/companyhelm-ng.git' 'companyhelm-ng'",
      completed: true,
      cwd: "~/workspace",
      directory: "companyhelm-ng",
      exitCode: 0,
      installationId: 110600868,
      repository: "CompanyHelm/companyhelm-ng",
      sessionId: null,
    },
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
      GH_PROMPT_DISABLED: "1",
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

test("AgentGithubExecTool rejects gh repo clone in favor of the dedicated clone tool", async () => {
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
      args: ["repo", "clone", "CompanyHelm/companyhelm-ng"],
      installationId: "110600868",
    }),
    /Use clone_github_repository instead of gh_exec for repository clones/,
  );
});
