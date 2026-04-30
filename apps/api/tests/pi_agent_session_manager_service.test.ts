import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { PiMonoSessionManagerService } from "../src/services/agent/session/pi-mono/session_manager_service.ts";

const piAgentMocks = vi.hoisted(() => {
  return {
    abortMock: vi.fn(async () => undefined),
    appendMessageMock: vi.fn<(message: unknown) => void>(),
    continueMock: vi.fn(async () => undefined),
    createExtensionRuntimeMock: vi.fn(() => ({})),
    createAgentSessionMock: vi.fn(),
    disposeMock: vi.fn(),
    findModelMock: vi.fn<(providerId: string, modelId: string) => unknown>(),
    newSessionMock: vi.fn<(options: { id?: string }) => void>(),
    promptMock: vi.fn(async () => undefined),
    registerProviderMock: vi.fn<(providerId: string, config: unknown) => void>(),
    setActiveToolsByNameMock: vi.fn<(toolNames: string[]) => void>(),
    setRuntimeApiKeyMock: vi.fn<(providerId: string, apiKey: string) => void>(),
    steerMock: vi.fn(async () => undefined),
    subscribeMock: vi.fn(),
    authStorageInstances: [] as Array<{ setRuntimeApiKey: ReturnType<typeof vi.fn> }>,
    modelRegistryInstances: [] as Array<{
      authStorage: unknown;
      find: ReturnType<typeof vi.fn>;
      registerProvider: ReturnType<typeof vi.fn>;
    }>,
    sessionManagerInstances: [] as Array<{
      appendMessage: ReturnType<typeof vi.fn>;
      newSession: ReturnType<typeof vi.fn>;
    }>,
  };
});

const mcpRuntimeClientMocks = vi.hoisted(() => {
  return {
    callToolMock: vi.fn(),
    listToolsMock: vi.fn(),
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
    registerProvider = piAgentMocks.registerProviderMock;

    constructor(authStorage: unknown) {
      this.authStorage = authStorage;
      piAgentMocks.modelRegistryInstances.push(this);
    }

    static inMemory(authStorage: unknown) {
      return new MockModelRegistry(authStorage);
    }
  }

  class MockSessionManager {
    appendMessage = piAgentMocks.appendMessageMock;
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

vi.mock("../src/services/mcp/runtime/client.ts", () => {
  class MockMcpRuntimeClient {
    callTool = mcpRuntimeClientMocks.callToolMock;
    listTools = mcpRuntimeClientMocks.listToolsMock;
  }

  return {
    McpRuntimeClient: MockMcpRuntimeClient,
  };
});

beforeEach(() => {
  piAgentMocks.abortMock.mockReset();
  piAgentMocks.appendMessageMock.mockReset();
  piAgentMocks.continueMock.mockReset();
  piAgentMocks.createExtensionRuntimeMock.mockClear();
  piAgentMocks.createAgentSessionMock.mockReset();
  piAgentMocks.disposeMock.mockReset();
  piAgentMocks.findModelMock.mockReset();
  piAgentMocks.newSessionMock.mockReset();
  piAgentMocks.promptMock.mockReset();
  piAgentMocks.registerProviderMock.mockReset();
  piAgentMocks.setActiveToolsByNameMock.mockReset();
  piAgentMocks.setRuntimeApiKeyMock.mockReset();
  piAgentMocks.steerMock.mockReset();
  piAgentMocks.subscribeMock.mockReset();
  piAgentMocks.authStorageInstances.length = 0;
  piAgentMocks.modelRegistryInstances.length = 0;
  piAgentMocks.sessionManagerInstances.length = 0;
  mcpRuntimeClientMocks.callToolMock.mockReset();
  mcpRuntimeClientMocks.listToolsMock.mockReset();
  mcpRuntimeClientMocks.listToolsMock.mockResolvedValue([]);
});

const logger = {
  child() {
    return logger;
  },
} as never;

const piMonoTestConfig = {
  agent_tools: {
    read_image: {
      default_resolution: {
        height: 768,
        width: 1024,
      },
      max_return_bytes: 4194304,
      max_source_bytes: 10485760,
    },
  },
  companyhelm: {
    e2b: {
      desktop_resolution: {
        height: 1080,
        width: 1920,
      },
    },
  },
} as const;

const emptyMcpService = {
  async listAgentMcpServers() {
    return [];
  },
} as never;

const baseToolNames = [
  "wait",
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
  "system_command",
  "list_github_installations",
  "clone_github_repository",
  "push_github_branch",
  "create_github_pull_request",
  "gh_exec",
  "web_search",
  "web_fetch",
  "ask_human_question",
  "send_agent_message",
] as const;

const computerUseToolNames = [
  "computer_screenshot",
  "computer_get_screen_size",
  "computer_get_cursor_position",
  "computer_move_mouse",
  "computer_left_click",
  "computer_double_click",
  "computer_right_click",
  "computer_middle_click",
  "computer_mouse_press",
  "computer_mouse_release",
  "computer_drag",
  "computer_scroll",
  "computer_write",
  "computer_press",
  "computer_wait_and_verify",
  "computer_open",
  "computer_launch",
  "computer_get_current_window_id",
  "computer_get_application_windows",
  "computer_get_window_title",
] as const;

const mediumTemplateSelection = {
  provider: "e2b",
  providerDefinitionId: "compute-provider-definition-1",
  template: {
    computerUse: true,
    cpuCount: 2,
    diskSpaceGb: 20,
    memoryGb: 4,
    name: "medium",
    templateId: "medium",
  },
} as const;

const smallTemplateSelection = {
  provider: "e2b",
  providerDefinitionId: "compute-provider-definition-1",
  template: {
    computerUse: false,
    cpuCount: 1,
    diskSpaceGb: 20,
    memoryGb: 2,
    name: "small",
    templateId: "small",
  },
} as const;

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
  const pendingMessageCount = 0;
  const createdSession = {
    abort: piAgentMocks.abortMock,
    agent: {
      continue: piAgentMocks.continueMock,
      state: {
        messages: [{
          content: "Updated context",
          role: "assistant",
          timestamp: 5678,
        }],
      },
    },
    dispose: piAgentMocks.disposeMock,
    getContextUsage() {
      return null;
    },
    isCompacting: false,
    model: null,
    prompt: piAgentMocks.promptMock,
    setActiveToolsByName: piAgentMocks.setActiveToolsByNameMock,
    steer: piAgentMocks.steerMock,
    subscribe: piAgentMocks.subscribeMock,
  };
  Object.defineProperty(createdSession, "pendingMessageCount", {
    get() {
      return pendingMessageCount;
    },
  });
  piAgentMocks.findModelMock.mockReturnValue(model);
  piAgentMocks.createAgentSessionMock.mockResolvedValue({
    session: createdSession,
  });
  const service = new PiMonoSessionManagerService(
    piMonoTestConfig as never,
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
        throw new Error("tools should not acquire an environment during createRuntime");
      },
    } as never,
    {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during createRuntime");
      },
    } as never,
    {
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during createRuntime");
      },
    } as never,
    {
      async listSecrets() {
        throw new Error("company secrets should not be loaded during createRuntime");
      },
      async listSessionSecrets() {
        throw new Error("session secrets should not be loaded during createRuntime");
      },
    } as never,
    {
      async sendMessage() {
        throw new Error("agent conversations should not be sent during createRuntime");
      },
    } as never,
    {
      async fetchHtmlContents() {
        throw new Error("web pages should not be fetched during createRuntime");
      },
      async fetchMarkdownContents() {
        throw new Error("web pages should not be fetched during createRuntime");
      },
      async search() {
        throw new Error("web searches should not run during createRuntime");
      },
    } as never,
    {
      async getAgentTemplateSelection() {
        return mediumTemplateSelection;
      },
    } as never,
    {
      async listDefinitions() {
        throw new Error("compute provider definitions should not be loaded during createRuntime");
      },
    } as never,
    {
      get() {
        throw new Error("model provider services should not be loaded during createRuntime");
      },
    } as never,
    undefined,
    {
      getDefaultModelForProvider() {
        throw new Error("app model registry should not be loaded during createRuntime");
      },
      getDefaultReasoningLevelForProvider() {
        throw new Error("app model registry should not be loaded during createRuntime");
      },
    } as never,
    emptyMcpService,
  );

  const runtime = await service.createRuntime(
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
                      agentId: "agent-1",
                      companyId: "company-1",
                      contextMessagesSnapshot: storedMessages,
                      contextMessagesSnapshotAt: new Date("2026-04-09T08:00:00.000Z"),
                      currentModelCredentialSource: "user_provided",
                      currentModelProviderCredentialModelId: "model-row-1",
                      encryptedApiKey: "sk-test",
                      modelProvider: "openai",
                      modelProviderCredentialId: "credential-1",
                      type: "api_key",
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

  await service.prompt(runtime, {
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        select() {
          return {
            from() {
              return {
                async where() {
                  return [{
                    agentId: "agent-1",
                    companyId: "company-1",
                    currentModelCredentialSource: "user_provided",
                    currentModelProviderCredentialModelId: "model-row-1",
                    encryptedApiKey: "sk-test",
                    modelProvider: "openai",
                    modelProviderCredentialId: "credential-1",
                    type: "api_key",
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
  await service.steer(runtime, {
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
  await service.persistRuntimeContextSnapshot(runtime, {
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
  } as never, "session-1", new Date("2026-04-21T19:00:00.000Z"));
  await service.abort(runtime);

  assert.equal(runtime.session, createdSession);
  assert.deepEqual(piAgentMocks.findModelMock.mock.calls, [["openai", "gpt-5.4"]]);
  assert.deepEqual(piAgentMocks.setRuntimeApiKeyMock.mock.calls, [["openai", "sk-test"]]);
  assert.deepEqual(piAgentMocks.newSessionMock.mock.calls, [[{ id: "session-1" }]]);
  assert.deepEqual(piAgentMocks.appendMessageMock.mock.calls, storedMessages.map((message) => [message]));
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls.length, 1);
  const createAgentSessionOptions = piAgentMocks.createAgentSessionMock.mock.calls[0]?.[0] as {
    cwd?: string;
    noTools?: string;
    tools?: string[];
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
  assert.equal(createAgentSessionOptions.noTools, "builtin");
  assert.equal(createAgentSessionOptions.tools, undefined);
  assert.deepEqual(
    createAgentSessionOptions.customTools?.map((tool) => tool.name),
    [...baseToolNames.slice(0, 11), ...computerUseToolNames, ...baseToolNames.slice(11)],
  );
  assert.deepEqual(createAgentSessionOptions.resourceLoader?.getAgentsFiles(), {
    agentsFiles: [],
  });
  assert.match(
    createAgentSessionOptions.resourceLoader?.getAppendSystemPrompt().join("\n\n") ?? "",
    /## CompanyHelm Operating Model/u,
  );
  assert.match(
    createAgentSessionOptions.resourceLoader?.getAppendSystemPrompt().join("\n\n") ?? "",
    /## Runtime Control Tools/u,
  );
  assert.match(
    createAgentSessionOptions.resourceLoader?.getAppendSystemPrompt().join("\n\n") ?? "",
    /## Terminal Tools/u,
  );
  assert.match(
    createAgentSessionOptions.resourceLoader?.getAppendSystemPrompt().join("\n\n") ?? "",
    /## Computer Use Tools/u,
  );
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
      ...baseToolNames.slice(0, 11),
      ...computerUseToolNames,
      ...baseToolNames.slice(11),
    ]]],
  );
  assert.deepEqual(piAgentMocks.promptMock.mock.calls, [["Draft the migration.", undefined]]);
  assert.deepEqual(piAgentMocks.steerMock.mock.calls, [["Focus on the failed migration.", undefined]]);
  assert.deepEqual(piAgentMocks.continueMock.mock.calls, []);
  assert.equal(piAgentMocks.abortMock.mock.calls.length, 1);
  assert.equal(persistedContextUpdates.filter((value) => "contextMessagesSnapshot" in value).length, 3);
  assert.deepEqual(
    persistedContextUpdates
      .filter((value) => "contextMessagesSnapshot" in value)
      .map((value) => value.contextMessagesSnapshot),
    [createdSession.agent.state.messages, createdSession.agent.state.messages, createdSession.agent.state.messages],
  );
  assert.equal(
    (
      persistedContextUpdates
        .filter((value) => "contextMessagesSnapshot" in value)[2]
        ?.contextMessagesSnapshotAt as Date | undefined
    )?.toISOString(),
    "2026-04-21T19:00:00.000Z",
  );
});

test("PiMonoSessionManagerService registers OpenAI-compatible runtime providers with the credential base URL", async () => {
  const createdSession = {
    abort: piAgentMocks.abortMock,
    agent: {
      continue: piAgentMocks.continueMock,
      state: {
        messages: [],
      },
    },
    dispose: piAgentMocks.disposeMock,
    getContextUsage() {
      return null;
    },
    isCompacting: false,
    model: null,
    prompt: piAgentMocks.promptMock,
    setActiveToolsByName: piAgentMocks.setActiveToolsByNameMock,
    steer: piAgentMocks.steerMock,
    subscribe: piAgentMocks.subscribeMock,
  };
  Object.defineProperty(createdSession, "pendingMessageCount", {
    get() {
      return 0;
    },
  });
  piAgentMocks.findModelMock.mockReturnValue({
    id: "llama3.1:8b",
    provider: "openai-compatible",
  });
  piAgentMocks.createAgentSessionMock.mockResolvedValue({
    session: createdSession,
  });
  const service = new PiMonoSessionManagerService(
    piMonoTestConfig as never,
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
        throw new Error("tools should not acquire an environment during createRuntime");
      },
    } as never,
    {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during createRuntime");
      },
    } as never,
    {
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during createRuntime");
      },
    } as never,
    {
      async listSecrets() {
        throw new Error("company secrets should not be loaded during createRuntime");
      },
      async listSessionSecrets() {
        throw new Error("session secrets should not be loaded during createRuntime");
      },
    } as never,
    {
      async sendMessage() {
        throw new Error("agent conversations should not be sent during createRuntime");
      },
    } as never,
    {
      async fetchHtmlContents() {
        throw new Error("web pages should not be fetched during createRuntime");
      },
      async fetchMarkdownContents() {
        throw new Error("web pages should not be fetched during createRuntime");
      },
      async search() {
        throw new Error("web searches should not run during createRuntime");
      },
    } as never,
    {
      async getAgentTemplateSelection() {
        return smallTemplateSelection;
      },
    } as never,
    {
      async listDefinitions() {
        throw new Error("compute provider definitions should not be loaded during createRuntime");
      },
    } as never,
    {
      get() {
        throw new Error("model provider services should not be loaded during createRuntime");
      },
    } as never,
    undefined,
    {
      getDefaultModelForProvider() {
        throw new Error("app model registry should not be loaded during createRuntime");
      },
      getDefaultReasoningLevelForProvider() {
        throw new Error("app model registry should not be loaded during createRuntime");
      },
    } as never,
    emptyMcpService,
  );

  await service.createRuntime(
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      contextMessagesSnapshot: [],
                      contextMessagesSnapshotAt: null,
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
      agentName: "Local Agent",
      apiKey: "ollama",
      baseUrl: "http://localhost:11434/v1",
      companyId: "company-1",
      companyName: "My Organization",
      modelId: "llama3.1:8b",
      modelName: "Llama 3.1 8B",
      providerId: "openai-compatible",
      reasoningSupported: false,
    },
  );

  assert.deepEqual(piAgentMocks.setRuntimeApiKeyMock.mock.calls, [["openai-compatible", "ollama"]]);
  assert.deepEqual(piAgentMocks.registerProviderMock.mock.calls, [[
    "openai-compatible",
    {
      api: "openai-completions",
      apiKey: "ollama",
      baseUrl: "http://localhost:11434/v1",
      models: [{
        compat: {
          maxTokensField: "max_tokens",
          supportsDeveloperRole: false,
          supportsReasoningEffort: false,
          supportsStore: false,
          supportsUsageInStreaming: false,
        },
        contextWindow: 128000,
        cost: {
          cacheRead: 0,
          cacheWrite: 0,
          input: 0,
          output: 0,
        },
        id: "llama3.1:8b",
        input: ["text"],
        maxTokens: 16384,
        name: "Llama 3.1 8B",
        reasoning: false,
      }],
    },
  ]]);
  assert.deepEqual(piAgentMocks.findModelMock.mock.calls, [["openai-compatible", "llama3.1:8b"]]);
});

test("PiMonoSessionManagerService prompt drains pending queued messages before closing the turn", async () => {
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
  let pendingMessageCount = 2;
  piAgentMocks.continueMock.mockImplementation(async () => {
    pendingMessageCount -= 1;
  });
  const createdSession = {
    abort: piAgentMocks.abortMock,
    agent: {
      continue: piAgentMocks.continueMock,
      state: {
        messages: [{
          content: "Updated context",
          role: "assistant",
          timestamp: 5678,
        }],
      },
    },
    dispose: piAgentMocks.disposeMock,
    getContextUsage() {
      return null;
    },
    isCompacting: false,
    model: null,
    prompt: piAgentMocks.promptMock,
    setActiveToolsByName: piAgentMocks.setActiveToolsByNameMock,
    steer: piAgentMocks.steerMock,
    subscribe: piAgentMocks.subscribeMock,
  };
  Object.defineProperty(createdSession, "pendingMessageCount", {
    get() {
      return pendingMessageCount;
    },
  });
  piAgentMocks.findModelMock.mockReturnValue(model);
  piAgentMocks.createAgentSessionMock.mockResolvedValue({
    session: createdSession,
  });
  const service = new PiMonoSessionManagerService(
    piMonoTestConfig as never,
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
        throw new Error("tools should not acquire an environment during createRuntime");
      },
    } as never,
    {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during createRuntime");
      },
    } as never,
    {
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during createRuntime");
      },
    } as never,
    {
      async listSecrets() {
        throw new Error("company secrets should not be loaded during createRuntime");
      },
      async listSessionSecrets() {
        throw new Error("session secrets should not be loaded during createRuntime");
      },
    } as never,
    {
      async sendMessage() {
        throw new Error("agent conversations should not be sent during createRuntime");
      },
    } as never,
    {
      async fetchHtmlContents() {
        throw new Error("web pages should not be fetched during createRuntime");
      },
      async fetchMarkdownContents() {
        throw new Error("web pages should not be fetched during createRuntime");
      },
      async search() {
        throw new Error("web searches should not run during createRuntime");
      },
    } as never,
    {
      async getAgentTemplateSelection() {
        return smallTemplateSelection;
      },
    } as never,
    {
      async listDefinitions() {
        throw new Error("compute provider definitions should not be loaded during createRuntime");
      },
    } as never,
    {
      get() {
        throw new Error("model provider services should not be loaded during createRuntime");
      },
    } as never,
    undefined,
    {
      getDefaultModelForProvider() {
        throw new Error("app model registry should not be loaded during createRuntime");
      },
      getDefaultReasoningLevelForProvider() {
        throw new Error("app model registry should not be loaded during createRuntime");
      },
    } as never,
    emptyMcpService,
  );

  const runtime = await service.createRuntime(
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
                      agentId: "agent-1",
                      companyId: "company-1",
                      contextMessagesSnapshot: storedMessages,
                      contextMessagesSnapshotAt: new Date("2026-04-09T08:00:00.000Z"),
                      currentModelCredentialSource: "user_provided",
                      currentModelProviderCredentialModelId: "model-row-1",
                      encryptedApiKey: "sk-test",
                      modelProvider: "openai",
                      modelProviderCredentialId: "credential-1",
                      type: "api_key",
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

  await service.prompt(runtime, {
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
                    agentId: "agent-1",
                    companyId: "company-1",
                    currentModelCredentialSource: "user_provided",
                    currentModelProviderCredentialModelId: "model-row-1",
                    encryptedApiKey: "sk-test",
                    modelProvider: "openai",
                    modelProviderCredentialId: "credential-1",
                    type: "api_key",
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

  assert.deepEqual(piAgentMocks.promptMock.mock.calls, [["Draft the migration.", undefined]]);
  assert.equal(piAgentMocks.continueMock.mock.calls.length, 2);
  assert.equal(pendingMessageCount, 0);
  assert.equal(persistedContextUpdates.filter((value) => "contextMessagesSnapshot" in value).length, 1);
});

test("PiMonoSessionManagerService creates a fresh runtime for each wake", async () => {
  const firstSession = {
    abort: piAgentMocks.abortMock,
    agent: {
      state: {
        messages: [],
      },
    },
    dispose: piAgentMocks.disposeMock,
    getContextUsage() {
      return null;
    },
    isCompacting: false,
    model: null,
    prompt: piAgentMocks.promptMock,
    setActiveToolsByName: piAgentMocks.setActiveToolsByNameMock,
    steer: piAgentMocks.steerMock,
    subscribe: piAgentMocks.subscribeMock,
  };
  const secondSession = {
    ...firstSession,
    agent: {
      state: {
        messages: [],
      },
    },
  };
  piAgentMocks.findModelMock.mockReturnValue({
    id: "gpt-5.4",
    provider: "openai",
  });
  piAgentMocks.createAgentSessionMock
    .mockResolvedValueOnce({
      session: firstSession,
    })
    .mockResolvedValueOnce({
      session: secondSession,
    });
  const service = new PiMonoSessionManagerService(
    piMonoTestConfig as never,
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
        throw new Error("tools should not acquire an environment during createRuntime");
      },
    } as never,
    {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during createRuntime");
      },
    } as never,
    {
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during createRuntime");
      },
    } as never,
    {
      async listSecrets() {
        throw new Error("company secrets should not be loaded during createRuntime");
      },
      async listSessionSecrets() {
        throw new Error("session secrets should not be loaded during createRuntime");
      },
    } as never,
    {
      async sendMessage() {
        throw new Error("agent conversations should not be sent during createRuntime");
      },
    } as never,
    {
      async fetchHtmlContents() {
        throw new Error("web pages should not be fetched during createRuntime");
      },
      async fetchMarkdownContents() {
        throw new Error("web pages should not be fetched during createRuntime");
      },
      async search() {
        throw new Error("web searches should not run during createRuntime");
      },
    } as never,
    {
      async getAgentTemplateSelection() {
        return smallTemplateSelection;
      },
    } as never,
    {
      async listDefinitions() {
        throw new Error("compute provider definitions should not be loaded during createRuntime");
      },
    } as never,
    {
      get() {
        throw new Error("model provider services should not be loaded during createRuntime");
      },
    } as never,
    undefined,
    {
      getDefaultModelForProvider() {
        throw new Error("app model registry should not be loaded during createRuntime");
      },
      getDefaultReasoningLevelForProvider() {
        throw new Error("app model registry should not be loaded during createRuntime");
      },
    } as never,
    emptyMcpService,
  );

  const first = await service.createRuntime(
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      contextMessagesSnapshot: [],
                      contextMessagesSnapshotAt: null,
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
  const second = await service.createRuntime(
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      contextMessagesSnapshot: [{
                        content: "restored on next wake",
                        role: "user",
                        timestamp: 1,
                      }],
                      contextMessagesSnapshotAt: new Date("2026-04-09T08:00:00.000Z"),
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

  assert.equal(first.session, firstSession);
  assert.equal(second.session, secondSession);
  assert.notEqual(first, second);
  assert.equal(piAgentMocks.createAgentSessionMock.mock.calls.length, 2);
  assert.equal(piAgentMocks.disposeMock.mock.calls.length, 0);
  assert.deepEqual(piAgentMocks.appendMessageMock.mock.calls, [[{
    content: "restored on next wake",
    role: "user",
    timestamp: 1,
  }]]);
  const createAgentSessionOptions = piAgentMocks.createAgentSessionMock.mock.calls[0]?.[0] as {
    resourceLoader?: {
      getAppendSystemPrompt(): string[];
    };
  };
  assert.doesNotMatch(
    createAgentSessionOptions.resourceLoader?.getAppendSystemPrompt().join("\n\n") ?? "",
    /## Computer Use Tools/u,
  );
  assert.deepEqual(
    piAgentMocks.setActiveToolsByNameMock.mock.calls,
    [[baseToolNames], [baseToolNames]],
  );
});

test("PiMonoSessionManagerService adds discovered MCP tools to newly created sessions", async () => {
  const createdSession = {
    abort: piAgentMocks.abortMock,
    agent: {
      continue: piAgentMocks.continueMock,
      state: {
        messages: [],
      },
    },
    dispose: piAgentMocks.disposeMock,
    getContextUsage() {
      return null;
    },
    isCompacting: false,
    model: null,
    prompt: piAgentMocks.promptMock,
    setActiveToolsByName: piAgentMocks.setActiveToolsByNameMock,
    steer: piAgentMocks.steerMock,
    subscribe: piAgentMocks.subscribeMock,
  };
  mcpRuntimeClientMocks.listToolsMock.mockResolvedValue([{
    description: "Search GitHub issues",
    inputSchema: {
      properties: {
        query: {
          type: "string",
        },
      },
      required: ["query"],
      type: "object",
    },
    name: "search_issues",
  }]);
  piAgentMocks.findModelMock.mockReturnValue({
    id: "gpt-5.4",
    provider: "openai",
  });
  piAgentMocks.createAgentSessionMock.mockResolvedValue({
    session: createdSession,
  });
  const service = new PiMonoSessionManagerService(
    piMonoTestConfig as never,
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
        throw new Error("tools should not acquire an environment during createRuntime");
      },
    } as never,
    {
      async getInstallationAccessToken() {
        throw new Error("github installation tokens should not be loaded during createRuntime");
      },
    } as never,
    {
      async createHumanQuestion() {
        throw new Error("inbox questions should not be created during createRuntime");
      },
    } as never,
    {
      async listSecrets() {
        throw new Error("company secrets should not be loaded during createRuntime");
      },
      async listSessionSecrets() {
        throw new Error("session secrets should not be loaded during createRuntime");
      },
    } as never,
    {
      async sendMessage() {
        throw new Error("agent conversations should not be sent during createRuntime");
      },
    } as never,
    {
      async fetchHtmlContents() {
        throw new Error("web pages should not be fetched during createRuntime");
      },
      async fetchMarkdownContents() {
        throw new Error("web pages should not be fetched during createRuntime");
      },
      async search() {
        throw new Error("web searches should not run during createRuntime");
      },
    } as never,
    {
      async getAgentTemplateSelection() {
        return smallTemplateSelection;
      },
    } as never,
    {
      async listDefinitions() {
        throw new Error("compute provider definitions should not be loaded during createRuntime");
      },
    } as never,
    {
      get() {
        throw new Error("model provider services should not be loaded during createRuntime");
      },
    } as never,
    undefined,
    {
      getDefaultModelForProvider() {
        throw new Error("app model registry should not be loaded during createRuntime");
      },
      getDefaultReasoningLevelForProvider() {
        throw new Error("app model registry should not be loaded during createRuntime");
      },
    } as never,
    {
      async listAgentMcpServers() {
        return [{
          authType: "none",
          callTimeoutMs: 5_000,
          companyId: "company-1",
          createdAt: new Date("2026-04-11T08:00:00.000Z"),
          description: null,
          enabled: true,
          headers: {},
          id: "server-1",
          name: "GitHub Tools",
          oauthClientId: null,
          oauthConnectionStatus: null,
          oauthGrantedScopes: [],
          oauthLastError: null,
          oauthRequestedScopes: [],
          updatedAt: new Date("2026-04-11T08:00:00.000Z"),
          url: "https://github.example.com/mcp",
        }];
      },
      async resolveMcpServerRequestHeaders() {
        return {
          Authorization: "Bearer test-token",
        };
      },
    } as never,
  );

  await service.createRuntime(
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      contextMessagesSnapshot: [],
                      contextMessagesSnapshotAt: null,
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

  const createAgentSessionOptions = piAgentMocks.createAgentSessionMock.mock.calls[0]?.[0] as {
    customTools?: Array<{ name: string }>;
    resourceLoader?: {
      getAppendSystemPrompt(): string[];
    };
  };
  const inboxToolIndex = baseToolNames.indexOf("ask_human_question");
  assert.deepEqual(
    createAgentSessionOptions.customTools?.map((tool) => tool.name),
    [
      ...baseToolNames.slice(0, inboxToolIndex),
      "github_tools__search_issues",
      ...baseToolNames.slice(inboxToolIndex),
    ],
  );
  assert.match(
    createAgentSessionOptions.resourceLoader?.getAppendSystemPrompt().join("\n\n") ?? "",
    /## MCP Tools/u,
  );
  assert.deepEqual(
    piAgentMocks.setActiveToolsByNameMock.mock.calls,
    [[[
      ...baseToolNames.slice(0, inboxToolIndex),
      "github_tools__search_issues",
      ...baseToolNames.slice(inboxToolIndex),
    ]]],
  );
});
