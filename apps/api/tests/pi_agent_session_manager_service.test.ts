import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { PiMonoSessionManagerService } from "../src/services/agent/session/pi-mono/session_manager_service.ts";

const piAgentMocks = vi.hoisted(() => {
  return {
    abortMock: vi.fn(async () => undefined),
    createExtensionRuntimeMock: vi.fn(() => ({})),
    createAgentSessionMock: vi.fn(),
    disposeMock: vi.fn(),
    findModelMock: vi.fn<(providerId: string, modelId: string) => unknown>(),
    newSessionMock: vi.fn<(options: { id?: string }) => void>(),
    promptMock: vi.fn(async () => undefined),
    replaceMessagesMock: vi.fn<(messages: unknown[]) => void>(),
    setActiveToolsByNameMock: vi.fn<(toolNames: string[]) => void>(),
    setRuntimeApiKeyMock: vi.fn<(providerId: string, apiKey: string) => void>(),
    steerMock: vi.fn(async () => undefined),
    subscribeMock: vi.fn(),
    authStorageInstances: [] as Array<{ setRuntimeApiKey: ReturnType<typeof vi.fn> }>,
    modelRegistryInstances: [] as Array<{ authStorage: unknown; find: ReturnType<typeof vi.fn> }>,
    sessionManagerInstances: [] as Array<{ newSession: ReturnType<typeof vi.fn> }>,
  };
});

vi.mock("@mariozechner/pi-coding-agent", () => {
  class MockAuthStorage {
    setRuntimeApiKey = piAgentMocks.setRuntimeApiKeyMock;

    static inMemory() {
      const instance = new MockAuthStorage();
      piAgentMocks.authStorageInstances.push(instance);
      return instance;
    }
  }

  class MockModelRegistry {
    readonly authStorage: unknown;
    find = piAgentMocks.findModelMock;

    constructor(authStorage: unknown) {
      this.authStorage = authStorage;
      piAgentMocks.modelRegistryInstances.push(this);
    }
  }

  class MockSessionManager {
    newSession = piAgentMocks.newSessionMock;

    static inMemory() {
      const instance = new MockSessionManager();
      piAgentMocks.sessionManagerInstances.push(instance);
      return instance;
    }
  }

  return {
    AuthStorage: MockAuthStorage,
    ModelRegistry: MockModelRegistry,
    SessionManager: MockSessionManager,
    createExtensionRuntime: piAgentMocks.createExtensionRuntimeMock,
    createAgentSession: piAgentMocks.createAgentSessionMock,
  };
});

beforeEach(() => {
  piAgentMocks.abortMock.mockReset();
  piAgentMocks.createExtensionRuntimeMock.mockClear();
  piAgentMocks.createAgentSessionMock.mockReset();
  piAgentMocks.disposeMock.mockReset();
  piAgentMocks.findModelMock.mockReset();
  piAgentMocks.newSessionMock.mockReset();
  piAgentMocks.promptMock.mockReset();
  piAgentMocks.replaceMessagesMock.mockReset();
  piAgentMocks.setActiveToolsByNameMock.mockReset();
  piAgentMocks.setRuntimeApiKeyMock.mockReset();
  piAgentMocks.steerMock.mockReset();
  piAgentMocks.subscribeMock.mockReset();
  piAgentMocks.authStorageInstances.length = 0;
  piAgentMocks.modelRegistryInstances.length = 0;
  piAgentMocks.sessionManagerInstances.length = 0;
});

const logger = {
  child() {
    return logger;
  },
} as never;

test("PiMonoSessionManagerService creates one runtime session and routes prompt plus steer calls through it", async () => {
  const storedMessages = [{
    content: "Earlier context",
    role: "user",
    timestamp: 1234,
  }];
  const persistedContextUpdates: Array<Record<string, unknown>> = [];
  const model = {
    id: "gpt-5.4",
    provider: "openai",
  };
  const createdSession = {
    abort: piAgentMocks.abortMock,
    agent: {
      replaceMessages: piAgentMocks.replaceMessagesMock,
      state: {
        messages: [{
          content: "Updated context",
          role: "assistant",
          timestamp: 5678,
        }],
      },
    },
    dispose: piAgentMocks.disposeMock,
    prompt: piAgentMocks.promptMock,
    setActiveToolsByName: piAgentMocks.setActiveToolsByNameMock,
    steer: piAgentMocks.steerMock,
    subscribe: piAgentMocks.subscribeMock,
  };
  piAgentMocks.findModelMock.mockReturnValue(model);
  piAgentMocks.createAgentSessionMock.mockResolvedValue({
    session: createdSession,
  });
  const service = new PiMonoSessionManagerService(
    logger,
    {
      async getClient() {
        return {
          async publish() {
            return 1;
          },
        };
      },
    } as never,
    {
      async getEnvironmentForSession() {
        throw new Error("tools should not acquire an environment during ensureSession");
      },
    } as never,
    {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during ensureSession");
      },
    } as never,
    {
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during ensureSession");
      },
    } as never,
    {
      async listSecrets() {
        throw new Error("company secrets should not be loaded during ensureSession");
      },
      async listSessionSecrets() {
        throw new Error("session secrets should not be loaded during ensureSession");
      },
    } as never,
    {
      async sendMessage() {
        throw new Error("agent conversations should not be sent during ensureSession");
      },
    } as never,
    {
      async fetchHtmlContents() {
        throw new Error("web pages should not be fetched during ensureSession");
      },
      async fetchMarkdownContents() {
        throw new Error("web pages should not be fetched during ensureSession");
      },
      async search() {
        throw new Error("web searches should not run during ensureSession");
      },
    } as never,
    {
      async getRequirements() {
        throw new Error("agent requirements should not be loaded during ensureSession");
      },
      async updateRequirements() {
        throw new Error("agent requirements should not be updated during ensureSession");
      },
    } as never,
    {
      async listDefinitions() {
        throw new Error("compute provider definitions should not be loaded during ensureSession");
      },
    } as never,
    {
      get() {
        throw new Error("model provider services should not be loaded during ensureSession");
      },
    } as never,
    {
      getDefaultModelForProvider() {
        throw new Error("app model registry should not be loaded during ensureSession");
      },
      getDefaultReasoningLevelForProvider() {
        throw new Error("app model registry should not be loaded during ensureSession");
      },
    } as never,
  );

  const session = await service.ensureSession(
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          insert() {
            return {
              async values() {
                return undefined;
              },
            };
          },
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      companyId: "company-1",
                      contextMessages: storedMessages,
                    }];
                  },
                };
              },
            };
          },
          update() {
            return {
              set(value: Record<string, unknown>) {
                persistedContextUpdates.push(value);
                return {
                  async where() {
                    return undefined;
                  },
                };
              },
            };
          },
        });
      },
    } as never,
    "session-1",
    {
      agentId: "agent-1",
      agentName: "Support Agent",
      apiKey: "sk-test",
      companyId: "company-1",
      companyName: "My Organization",
      modelId: "gpt-5.4",
      providerId: "openai",
      reasoningLevel: "high",
    },
  );

  await service.prompt({
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        insert() {
          return {
            async values() {
              return undefined;
            },
          };
        },
        select() {
          return {
            from() {
              return {
                async where() {
                  return [{
                    companyId: "company-1",
                  }];
                },
              };
            },
          };
        },
        update() {
          return {
            set(value: Record<string, unknown>) {
              persistedContextUpdates.push(value);
              return {
                async where() {
                  return undefined;
                },
              };
            },
          };
        },
      });
    },
  } as never, "session-1", "Draft the migration.");
  await service.steer({
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        update() {
          return {
            set(value: Record<string, unknown>) {
              persistedContextUpdates.push(value);
              return {
                async where() {
                  return undefined;
                },
              };
            },
          };
        },
      });
    },
  } as never, "session-1", "Focus on the failed migration.");
  await service.abort("session-1");

  assert.equal(session, createdSession);
  assert.equal(service.get("session-1"), createdSession);
  assert.deepEqual(piAgentMocks.findModelMock.mock.calls, [["openai", "gpt-5.4"]]);
  assert.deepEqual(piAgentMocks.setRuntimeApiKeyMock.mock.calls, [["openai", "sk-test"]]);
  assert.deepEqual(piAgentMocks.newSessionMock.mock.calls, [[{ id: "session-1" }]]);
  assert.deepEqual(piAgentMocks.replaceMessagesMock.mock.calls, [[storedMessages]]);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls.length, 1);
  const createAgentSessionOptions = piAgentMocks.createAgentSessionMock.mock.calls[0]?.[0] as {
    cwd?: string;
    tools?: Array<{ name: string }>;
    customTools?: Array<{ name: string }>;
    resourceLoader?: {
      getAgentsFiles(): {
        agentsFiles: Array<{
          content: string;
          path: string;
        }>;
      };
      getAppendSystemPrompt(): string[];
      getSystemPrompt(): string | undefined;
    };
  };
  assert.equal(createAgentSessionOptions.cwd, "~/workspace");
  assert.deepEqual(createAgentSessionOptions.tools, []);
  assert.deepEqual(
    createAgentSessionOptions.customTools?.map((tool) => tool.name),
    [
      "list_pty_sessions",
      "execute_command",
      "apply_patch",
      "send_pty_input",
      "read_pty_output",
      "resize_pty",
      "kill_session",
      "close_session",
      "list_assigned_secrets",
      "list_available_secrets",
      "list_company_members",
      "list_company_agents",
      "list_agents",
      "create_agent",
      "update_agent",
      "list_github_installations",
      "gh_exec",
      "web_search",
      "web_fetch",
      "ask_human_question",
      "send_agent_message",
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
  assert.deepEqual(createAgentSessionOptions.resourceLoader?.getAgentsFiles(), {
    agentsFiles: [],
  });
  assert.deepEqual(createAgentSessionOptions.resourceLoader?.getAppendSystemPrompt(), []);
  assert.match(
    createAgentSessionOptions.resourceLoader?.getSystemPrompt() ?? "",
    /do not have local filesystem access/i,
  );
  assert.match(
    createAgentSessionOptions.resourceLoader?.getSystemPrompt() ?? "",
    /Agent name:\s+Support Agent/i,
  );
  assert.match(
    createAgentSessionOptions.resourceLoader?.getSystemPrompt() ?? "",
    /Agent id:\s+agent-1/i,
  );
  assert.match(
    createAgentSessionOptions.resourceLoader?.getSystemPrompt() ?? "",
    /Session id:\s+session-1/i,
  );
  assert.deepEqual(
    piAgentMocks.setActiveToolsByNameMock.mock.calls,
    [[[
      "list_pty_sessions",
      "execute_command",
      "apply_patch",
      "send_pty_input",
      "read_pty_output",
      "resize_pty",
      "kill_session",
      "close_session",
      "list_assigned_secrets",
      "list_available_secrets",
      "list_company_members",
      "list_company_agents",
      "list_agents",
      "create_agent",
      "update_agent",
      "list_github_installations",
      "gh_exec",
      "web_search",
      "web_fetch",
      "ask_human_question",
      "send_agent_message",
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
    ]]],
  );
  assert.deepEqual(piAgentMocks.promptMock.mock.calls, [["Draft the migration.", undefined]]);
  assert.deepEqual(piAgentMocks.steerMock.mock.calls, [["Focus on the failed migration.", undefined]]);
  assert.equal(piAgentMocks.abortMock.mock.calls.length, 1);
  assert.equal(persistedContextUpdates.filter((value) => "context_messages" in value).length, 2);
  assert.deepEqual(
    persistedContextUpdates
      .filter((value) => "context_messages" in value)
      .map((value) => value.context_messages),
    [createdSession.agent.state.messages, createdSession.agent.state.messages],
  );
});

test("PiMonoSessionManagerService reuses the live runtime session for repeated ensureSession calls", async () => {
  const createdSession = {
    abort: piAgentMocks.abortMock,
    agent: {
      replaceMessages: piAgentMocks.replaceMessagesMock,
      state: {
        messages: [],
      },
    },
    dispose: piAgentMocks.disposeMock,
    prompt: piAgentMocks.promptMock,
    setActiveToolsByName: piAgentMocks.setActiveToolsByNameMock,
    steer: piAgentMocks.steerMock,
    subscribe: piAgentMocks.subscribeMock,
  };
  piAgentMocks.findModelMock.mockReturnValue({
    id: "gpt-5.4",
    provider: "openai",
  });
  piAgentMocks.createAgentSessionMock.mockResolvedValue({
    session: createdSession,
  });
  const service = new PiMonoSessionManagerService(
    logger,
    {
      async getClient() {
        return {
          async publish() {
            return 1;
          },
        };
      },
    } as never,
    {
      async getEnvironmentForSession() {
        throw new Error("tools should not acquire an environment during ensureSession");
      },
    } as never,
    {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during ensureSession");
      },
    } as never,
    {
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during ensureSession");
      },
    } as never,
    {
      async listSecrets() {
        throw new Error("company secrets should not be loaded during ensureSession");
      },
      async listSessionSecrets() {
        throw new Error("session secrets should not be loaded during ensureSession");
      },
    } as never,
    {
      async sendMessage() {
        throw new Error("agent conversations should not be sent during ensureSession");
      },
    } as never,
    {
      async fetchHtmlContents() {
        throw new Error("web pages should not be fetched during ensureSession");
      },
      async fetchMarkdownContents() {
        throw new Error("web pages should not be fetched during ensureSession");
      },
      async search() {
        throw new Error("web searches should not run during ensureSession");
      },
    } as never,
    {
      async getRequirements() {
        throw new Error("agent requirements should not be loaded during ensureSession");
      },
      async updateRequirements() {
        throw new Error("agent requirements should not be updated during ensureSession");
      },
    } as never,
    {
      async listDefinitions() {
        throw new Error("compute provider definitions should not be loaded during ensureSession");
      },
    } as never,
    {
      get() {
        throw new Error("model provider services should not be loaded during ensureSession");
      },
    } as never,
    {
      getDefaultModelForProvider() {
        throw new Error("app model registry should not be loaded during ensureSession");
      },
      getDefaultReasoningLevelForProvider() {
        throw new Error("app model registry should not be loaded during ensureSession");
      },
    } as never,
  );

  const first = await service.ensureSession(
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      contextMessages: [],
                    }];
                  },
                };
              },
            };
          },
        });
      },
    } as never,
    "session-1",
    {
      agentId: "agent-1",
      agentName: "Support Agent",
      apiKey: "sk-test",
      companyId: "company-1",
      companyName: "My Organization",
      modelId: "gpt-5.4",
      providerId: "openai",
      reasoningLevel: "medium",
    },
  );
  const second = await service.ensureSession(
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      contextMessages: [{
                        content: "ignored on reuse",
                        role: "user",
                        timestamp: 1,
                      }],
                    }];
                  },
                };
              },
            };
          },
        });
      },
    } as never,
    "session-1",
    {
      agentId: "agent-1",
      agentName: "Support Agent",
      apiKey: "sk-test-2",
      companyId: "company-1",
      companyName: "My Organization",
      modelId: "gpt-5.4",
      providerId: "openai",
      reasoningLevel: "low",
    },
  );

  assert.equal(first, createdSession);
  assert.equal(second, createdSession);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls.length, 1);
  assert.equal(piAgentMocks.disposeMock.mock.calls.length, 0);
  assert.deepEqual(piAgentMocks.replaceMessagesMock.mock.calls, [[[]]]);
  assert.deepEqual(
    piAgentMocks.setActiveToolsByNameMock.mock.calls,
    [[[
      "list_pty_sessions",
      "execute_command",
      "apply_patch",
      "send_pty_input",
      "read_pty_output",
      "resize_pty",
      "kill_session",
      "close_session",
      "list_assigned_secrets",
      "list_available_secrets",
      "list_company_members",
      "list_company_agents",
      "list_agents",
      "create_agent",
      "update_agent",
      "list_github_installations",
      "gh_exec",
      "web_search",
      "web_fetch",
      "ask_human_question",
      "send_agent_message",
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
    ]]],
  );
});
