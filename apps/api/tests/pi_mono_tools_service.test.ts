import assert from "node:assert/strict";
import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import { test, vi } from "vitest";
import { AgentManagementToolProvider } from "../src/services/agent/session/pi-mono/tools/agents/provider.ts";
import { AgentArtifactToolProvider } from "../src/services/agent/session/pi-mono/tools/artifacts/provider.ts";
import { AgentCompanyDirectoryToolProvider } from "../src/services/agent/session/pi-mono/tools/company_directory/provider.ts";
import { AgentConversationToolProvider } from "../src/services/agent/session/pi-mono/tools/conversations/provider.ts";
import { AgentGithubToolProvider } from "../src/services/agent/session/pi-mono/tools/github/provider.ts";
import { AgentInboxToolProvider } from "../src/services/agent/session/pi-mono/tools/inbox/provider.ts";
import { AgentSecretToolProvider } from "../src/services/agent/session/pi-mono/tools/secrets/provider.ts";
import { AgentSkillToolProvider } from "../src/services/agent/session/pi-mono/tools/skills/provider.ts";
import { AgentToolsService } from "../src/services/agent/session/pi-mono/tools/service.ts";
import { AgentTerminalToolProvider } from "../src/services/agent/session/pi-mono/tools/terminal/provider.ts";
import { AgentReadImageToolService } from "../src/services/agent/session/pi-mono/tools/terminal/read_image_service.ts";
import { AgentWebToolProvider } from "../src/services/agent/session/pi-mono/tools/web/provider.ts";

function createReadImageToolService(): AgentReadImageToolService {
  return new AgentReadImageToolService({
    defaultResolutionHeight: 1280,
    defaultResolutionWidth: 1280,
    maxReturnBytes: 4 * 1024 * 1024,
    maxSourceBytes: 25 * 1024 * 1024,
  });
}

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
    } as never, {} as never, createReadImageToolService()),
    new AgentSecretToolProvider({
      async listAssignedSecrets() {
        throw new Error("assigned secrets should not be loaded during initialization");
      },
      async readAssignedSecret() {
        throw new Error("assigned secret reads should not be loaded during initialization");
      },
      async listAvailableSecrets() {
        throw new Error("available secrets should not be loaded during initialization");
      },
    } as never),
    new AgentSkillToolProvider({
      async activateSkill() {
        throw new Error("skills should not be activated during initialization");
      },
      async listAvailableSkills() {
        throw new Error("available skills should not be loaded during initialization");
      },
    } as never),
    new AgentCompanyDirectoryToolProvider({
      async listCompanyAgents() {
        throw new Error("company agents should not be loaded during initialization");
      },
      async listCompanyMembers() {
        throw new Error("company members should not be loaded during initialization");
      },
    } as never),
    new AgentManagementToolProvider({
      async createAgent() {
        throw new Error("agents should not be created during initialization");
      },
      async listAgents() {
        throw new Error("agents should not be listed during initialization");
      },
      async updateAgent() {
        throw new Error("agents should not be updated during initialization");
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
    new AgentWebToolProvider({
      async fetchPages() {
        throw new Error("web pages should not be fetched during initialization");
      },
      async searchWeb() {
        throw new Error("web searches should not be run during initialization");
      },
    } as never),
    new AgentInboxToolProvider({
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during initialization");
      },
    } as never),
    new AgentConversationToolProvider({
      async sendMessage() {
        throw new Error("agent messages should not be sent during initialization");
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
      "pty_list",
      "pty_exec",
      "bash_exec",
      "apply_patch",
      "pty_send_input",
      "pty_read_output",
      "pty_resize",
      "pty_kill",
      "read_image",
      "get_e2b_port_url",
      "list_assigned_secrets",
      "read_secret",
      "list_available_secrets",
      "activate_skill",
      "list_company_members",
      "list_company_agents",
      "list_agents",
      "create_agent",
      "update_agent",
      "list_github_installations",
      "clone_github_repository",
      "push_github_branch",
      "create_github_pull_request",
      "gh_exec",
      "web_search",
      "web_fetch",
      "ask_human_question",
      "send_agent_message",
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
    } as never, {} as never, createReadImageToolService()),
    new AgentSecretToolProvider({
      async listAssignedSecrets() {
        throw new Error("assigned secrets should not be loaded during cleanup");
      },
      async readAssignedSecret() {
        throw new Error("assigned secret reads should not be loaded during cleanup");
      },
      async listAvailableSecrets() {
        throw new Error("available secrets should not be loaded during cleanup");
      },
    } as never),
    new AgentSkillToolProvider({
      async activateSkill() {
        throw new Error("skills should not be activated during cleanup");
      },
      async listAvailableSkills() {
        throw new Error("available skills should not be loaded during cleanup");
      },
    } as never),
    new AgentCompanyDirectoryToolProvider({
      async listCompanyAgents() {
        throw new Error("company agents should not be loaded during cleanup");
      },
      async listCompanyMembers() {
        throw new Error("company members should not be loaded during cleanup");
      },
    } as never),
    new AgentManagementToolProvider({
      async createAgent() {
        throw new Error("agents should not be created during cleanup");
      },
      async listAgents() {
        throw new Error("agents should not be listed during cleanup");
      },
      async updateAgent() {
        throw new Error("agents should not be updated during cleanup");
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
    new AgentWebToolProvider({
      async fetchPages() {
        throw new Error("web pages should not be fetched during cleanup");
      },
      async searchWeb() {
        throw new Error("web searches should not be run during cleanup");
      },
    } as never),
    new AgentInboxToolProvider({
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during cleanup");
      },
    } as never),
    new AgentConversationToolProvider({
      async sendMessage() {
        throw new Error("agent messages should not be sent during cleanup");
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

test("AgentToolsService truncates oversized text tool output with an inline marker", async () => {
  const oversizedText = "x".repeat(1_000_001);
  const service = new AgentToolsService({
    async dispose() {
      return undefined;
    },
    async getEnvironment() {
      throw new Error("tool execution should not acquire the prompt environment");
    },
  } as never, [{
    createToolDefinitions() {
      return [{
        description: "Returns oversized text output.",
        execute: async () => ({
          content: [{
            text: oversizedText,
            type: "text",
          }],
          details: undefined,
        }),
        label: "Oversized",
        name: "oversized_text",
        parameters: {} as never,
      }];
    },
  } as never]);

  const [tool] = service.initializeTools();
  const result = await tool.execute("tool-call-1", {} as never, undefined, undefined, {} as never);
  const text = result.content[0]?.type === "text" ? result.content[0].text : null;

  assert.ok(text);
  assert.equal(text.length, 1_000_000);
  assert.match(text, /^\[Tool output truncated: original length 1000001 characters; maximum is 1000000 characters\.\]\n\n/u);
  assert.equal(text.endsWith("x"), true);
});

test("AgentToolsService leaves text tool output at the limit unchanged", async () => {
  const limitedText = "x".repeat(1_000_000);
  const service = new AgentToolsService({
    async dispose() {
      return undefined;
    },
    async getEnvironment() {
      throw new Error("tool execution should not acquire the prompt environment");
    },
  } as never, [{
    createToolDefinitions() {
      return [{
        description: "Returns text output at the limit.",
        execute: async () => ({
          content: [{
            text: limitedText,
            type: "text",
          }],
          details: undefined,
        }),
        label: "Limited",
        name: "limited_text",
        parameters: {} as never,
      }];
    },
  } as never]);

  const [tool] = service.initializeTools();
  const result = await tool.execute("tool-call-1", {} as never, undefined, undefined, {} as never);
  const text = result.content[0]?.type === "text" ? result.content[0].text : null;

  assert.equal(text, limitedText);
});

test("AgentToolsService truncates streamed text tool updates", async () => {
  const oversizedText = "x".repeat(1_000_001);
  const streamedTexts: string[] = [];
  const service = new AgentToolsService({
    async dispose() {
      return undefined;
    },
    async getEnvironment() {
      throw new Error("tool execution should not acquire the prompt environment");
    },
  } as never, [{
    createToolDefinitions() {
      return [{
        description: "Streams oversized text output.",
        execute: async (_toolCallId: string, _params: unknown, _signal: AbortSignal | undefined, onUpdate) => {
          onUpdate?.({
            content: [{
              text: oversizedText,
              type: "text",
            }],
            details: undefined,
          });

          return {
            content: [{
              text: "done",
              type: "text",
            }],
            details: undefined,
          };
        },
        label: "Streaming oversized",
        name: "streaming_oversized_text",
        parameters: {} as never,
      }];
    },
  } as never]);

  const [tool] = service.initializeTools();
  await tool.execute("tool-call-1", {} as never, undefined, (partialResult) => {
    const text = partialResult.content[0]?.type === "text" ? partialResult.content[0].text : null;
    if (text) {
      streamedTexts.push(text);
    }
  }, {} as never);

  assert.equal(streamedTexts.length, 1);
  assert.equal(streamedTexts[0]?.length, 1_000_000);
  assert.match(streamedTexts[0] ?? "", /^\[Tool output truncated: original length 1000001 characters; maximum is 1000000 characters\.\]\n\n/u);
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
    } as never, {} as never, createReadImageToolService()),
    new AgentSecretToolProvider({
      async listAssignedSecrets() {
        throw new Error("assigned secrets should not be loaded during session creation");
      },
      async readAssignedSecret() {
        throw new Error("assigned secret reads should not be loaded during session creation");
      },
      async listAvailableSecrets() {
        throw new Error("available secrets should not be loaded during session creation");
      },
    } as never),
    new AgentSkillToolProvider({
      async activateSkill() {
        throw new Error("skills should not be activated during session creation");
      },
      async listAvailableSkills() {
        throw new Error("available skills should not be loaded during session creation");
      },
    } as never),
    new AgentCompanyDirectoryToolProvider({
      async listCompanyAgents() {
        throw new Error("company agents should not be loaded during session creation");
      },
      async listCompanyMembers() {
        throw new Error("company members should not be loaded during session creation");
      },
    } as never),
    new AgentManagementToolProvider({
      async createAgent() {
        throw new Error("agents should not be created during session creation");
      },
      async listAgents() {
        throw new Error("agents should not be listed during session creation");
      },
      async updateAgent() {
        throw new Error("agents should not be updated during session creation");
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
    new AgentWebToolProvider({
      async fetchPages() {
        throw new Error("web pages should not be fetched during session creation");
      },
      async searchWeb() {
        throw new Error("web searches should not run during session creation");
      },
    } as never),
    new AgentInboxToolProvider({
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during session creation");
      },
    } as never),
    new AgentConversationToolProvider({
      async sendMessage() {
        throw new Error("agent messages should not be sent during session creation");
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
    noTools: "builtin",
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
      "pty_list",
      "pty_exec",
      "bash_exec",
      "apply_patch",
      "pty_send_input",
      "pty_read_output",
      "pty_resize",
      "pty_kill",
      "read_image",
      "get_e2b_port_url",
      "list_assigned_secrets",
      "read_secret",
      "list_available_secrets",
      "activate_skill",
      "list_company_members",
      "list_company_agents",
      "list_agents",
      "create_agent",
      "update_agent",
      "list_github_installations",
      "clone_github_repository",
      "push_github_branch",
      "create_github_pull_request",
      "gh_exec",
      "web_search",
      "web_fetch",
      "ask_human_question",
      "send_agent_message",
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
