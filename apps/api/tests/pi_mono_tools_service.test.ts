import assert from "node:assert/strict";
import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import { test, vi } from "vitest";
import { AgentArtifactToolProvider } from "../src/services/agent/tools/artifacts/provider.ts";
import { AgentGithubToolProvider } from "../src/services/agent/tools/github/provider.ts";
import { AgentInboxToolProvider } from "../src/services/agent/tools/inbox/provider.ts";
import { AgentSecretToolProvider } from "../src/services/agent/tools/secrets/provider.ts";
import { AgentToolsService } from "../src/services/agent/tools/service.ts";
import { AgentTaskToolProvider } from "../src/services/agent/tools/tasks/provider.ts";
import { AgentTerminalToolProvider } from "../src/services/agent/tools/terminal/provider.ts";

test("AgentToolsService initializes the environment-backed terminal tool catalog once per prompt scope", () => {
  const service = new AgentToolsService({
    async dispose() {
      return undefined;
    },
    async getEnvironment() {
      throw new Error("tools should not acquire the environment during initialization");
    },
  } as never, [
    new AgentTerminalToolProvider({
      async getEnvironment() {
        throw new Error("tools should not acquire the environment during initialization");
      },
    } as never),
    new AgentSecretToolProvider({
      async listAssignedSecrets() {
        throw new Error("assigned secrets should not be loaded during initialization");
      },
      async listAvailableSecrets() {
        throw new Error("available secrets should not be loaded during initialization");
      },
    } as never),
    new AgentGithubToolProvider({
      async getEnvironment() {
        throw new Error("tools should not acquire the environment during initialization");
      },
    } as never, {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during initialization");
      },
      async listInstallations() {
        throw new Error("github installations should not be loaded during initialization");
      },
    } as never),
    new AgentInboxToolProvider({
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during initialization");
      },
    } as never),
    new AgentTaskToolProvider({
      async createTask() {
        throw new Error("tasks should not be created during initialization");
      },
      async listAssignedTasks() {
        throw new Error("assigned tasks should not be listed during initialization");
      },
      async listTasks() {
        throw new Error("tasks should not be listed during initialization");
      },
      async updateTaskStatus() {
        throw new Error("task status should not be updated during initialization");
      },
    } as never),
    new AgentArtifactToolProvider({
      async archiveArtifact() {
        throw new Error("artifact archive should not run during initialization");
      },
      async createExternalLinkArtifact() {
        throw new Error("artifact create should not run during initialization");
      },
      async createMarkdownArtifact() {
        throw new Error("artifact create should not run during initialization");
      },
      async createPullRequestArtifact() {
        throw new Error("artifact create should not run during initialization");
      },
      async getArtifact() {
        throw new Error("artifact reads should not run during initialization");
      },
      async listArtifacts() {
        throw new Error("artifact listing should not run during initialization");
      },
      async updateArtifactMetadata() {
        throw new Error("artifact updates should not run during initialization");
      },
      async updateExternalLinkArtifact() {
        throw new Error("artifact updates should not run during initialization");
      },
      async updateMarkdownArtifact() {
        throw new Error("artifact updates should not run during initialization");
      },
    } as never),
  ]);

  const tools = service.initializeTools();

  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      "list_pty_sessions",
      "execute_command",
      "send_pty_input",
      "read_pty_output",
      "resize_pty",
      "kill_session",
      "close_session",
      "list_assigned_secrets",
      "list_available_secrets",
      "list_github_installations",
      "gh_exec",
      "ask_human_question",
      "list_tasks",
      "list_assigned_tasks",
      "create_task",
      "update_task_status",
      "list_artifacts",
      "get_artifact",
      "create_markdown_artifact",
      "create_external_link_artifact",
      "create_pull_request_artifact",
      "update_artifact_metadata",
      "update_markdown_artifact",
      "update_external_link_artifact",
      "archive_artifact",
    ],
  );
  assert.equal(service.initializeTools(), tools);
});

test("AgentToolsService cleanup disposes the prompt scope", async () => {
  const dispose = vi.fn(async () => undefined);
  const service = new AgentToolsService({
    async dispose() {
      await dispose();
    },
    async getEnvironment() {
      throw new Error("tools should not acquire the environment during cleanup");
    },
  } as never, [
    new AgentTerminalToolProvider({
      async getEnvironment() {
        throw new Error("tools should not acquire the environment during cleanup");
      },
    } as never),
    new AgentSecretToolProvider({
      async listAssignedSecrets() {
        throw new Error("assigned secrets should not be loaded during cleanup");
      },
      async listAvailableSecrets() {
        throw new Error("available secrets should not be loaded during cleanup");
      },
    } as never),
    new AgentGithubToolProvider({
      async getEnvironment() {
        throw new Error("tools should not acquire the environment during cleanup");
      },
    } as never, {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during cleanup");
      },
      async listInstallations() {
        throw new Error("github installations should not be loaded during cleanup");
      },
    } as never),
    new AgentInboxToolProvider({
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during cleanup");
      },
    } as never),
    new AgentTaskToolProvider({
      async createTask() {
        throw new Error("tasks should not be created during cleanup");
      },
      async listAssignedTasks() {
        throw new Error("assigned tasks should not be listed during cleanup");
      },
      async listTasks() {
        throw new Error("tasks should not be listed during cleanup");
      },
      async updateTaskStatus() {
        throw new Error("task status should not be updated during cleanup");
      },
    } as never),
    new AgentArtifactToolProvider({
      async archiveArtifact() {
        throw new Error("artifact archive should not run during cleanup");
      },
      async createExternalLinkArtifact() {
        throw new Error("artifact create should not run during cleanup");
      },
      async createMarkdownArtifact() {
        throw new Error("artifact create should not run during cleanup");
      },
      async createPullRequestArtifact() {
        throw new Error("artifact create should not run during cleanup");
      },
      async getArtifact() {
        throw new Error("artifact reads should not run during cleanup");
      },
      async listArtifacts() {
        throw new Error("artifact listing should not run during cleanup");
      },
      async updateArtifactMetadata() {
        throw new Error("artifact updates should not run during cleanup");
      },
      async updateExternalLinkArtifact() {
        throw new Error("artifact updates should not run during cleanup");
      },
      async updateMarkdownArtifact() {
        throw new Error("artifact updates should not run during cleanup");
      },
    } as never),
  ]);

  service.initializeTools();
  await service.cleanupTools();

  assert.equal(dispose.mock.calls.length, 1);
});

test("AgentToolsService custom tools can be injected into a live PI Mono session", async () => {
  const authStorage = AuthStorage.inMemory();
  authStorage.setRuntimeApiKey("openai", "sk-test");
  const modelRegistry = new ModelRegistry(authStorage);
  const model = modelRegistry.find("openai", "gpt-5.4");
  if (!model) {
    throw new Error("Model not found.");
  }

  const service = new AgentToolsService({
    async dispose() {
      return undefined;
    },
    async getEnvironment() {
      throw new Error("session creation should not eagerly acquire the environment");
    },
  } as never, [
    new AgentTerminalToolProvider({
      async getEnvironment() {
        throw new Error("session creation should not eagerly acquire the environment");
      },
    } as never),
    new AgentSecretToolProvider({
      async listAssignedSecrets() {
        throw new Error("assigned secrets should not be loaded during session creation");
      },
      async listAvailableSecrets() {
        throw new Error("available secrets should not be loaded during session creation");
      },
    } as never),
    new AgentGithubToolProvider({
      async getEnvironment() {
        throw new Error("session creation should not eagerly acquire the environment");
      },
    } as never, {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during session creation");
      },
      async listInstallations() {
        throw new Error("github installations should not be loaded during session creation");
      },
    } as never),
    new AgentInboxToolProvider({
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during session creation");
      },
    } as never),
    new AgentTaskToolProvider({
      async createTask() {
        throw new Error("tasks should not be created during session creation");
      },
      async listAssignedTasks() {
        throw new Error("assigned tasks should not be listed during session creation");
      },
      async listTasks() {
        throw new Error("tasks should not be listed during session creation");
      },
      async updateTaskStatus() {
        throw new Error("task status should not be updated during session creation");
      },
    } as never),
    new AgentArtifactToolProvider({
      async archiveArtifact() {
        throw new Error("artifact archive should not run during session creation");
      },
      async createExternalLinkArtifact() {
        throw new Error("artifact create should not run during session creation");
      },
      async createMarkdownArtifact() {
        throw new Error("artifact create should not run during session creation");
      },
      async createPullRequestArtifact() {
        throw new Error("artifact create should not run during session creation");
      },
      async getArtifact() {
        throw new Error("artifact reads should not run during session creation");
      },
      async listArtifacts() {
        throw new Error("artifact listing should not run during session creation");
      },
      async updateArtifactMetadata() {
        throw new Error("artifact updates should not run during session creation");
      },
      async updateExternalLinkArtifact() {
        throw new Error("artifact updates should not run during session creation");
      },
      async updateMarkdownArtifact() {
        throw new Error("artifact updates should not run during session creation");
      },
    } as never),
  ]);

  const sessionManager = SessionManager.inMemory();
  sessionManager.newSession({
    id: "session-1",
  });
  const tools = service.initializeTools();
  const { session } = await createAgentSession({
    authStorage,
    tools: [],
    customTools: tools,
    model,
    modelRegistry,
    sessionManager,
    thinkingLevel: "low",
  });
  session.setActiveToolsByName(tools.map((tool) => tool.name));

  assert.deepEqual(
    session.agent.state.tools.map((tool) => tool.name),
    [
      "list_pty_sessions",
      "execute_command",
      "send_pty_input",
      "read_pty_output",
      "resize_pty",
      "kill_session",
      "close_session",
      "list_assigned_secrets",
      "list_available_secrets",
      "list_github_installations",
      "gh_exec",
      "ask_human_question",
      "list_tasks",
      "list_assigned_tasks",
      "create_task",
      "update_task_status",
      "list_artifacts",
      "get_artifact",
      "create_markdown_artifact",
      "create_external_link_artifact",
      "create_pull_request_artifact",
      "update_artifact_metadata",
      "update_markdown_artifact",
      "update_external_link_artifact",
      "archive_artifact",
    ],
  );

  session.dispose();
});
