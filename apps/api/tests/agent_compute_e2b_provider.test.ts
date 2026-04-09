import assert from "node:assert/strict";
import { Sandbox as DesktopSandbox } from "@e2b/desktop";
import { afterEach, test, vi } from "vitest";
import { CommandExitError, Sandbox } from "e2b";
import { AgentComputeE2bProvider } from "../src/services/environments/providers/e2b/e2b_provider.ts";

function createComputeProviderDefinitionService() {
  return {
    async loadRuntimeDefinitionById() {
      return {
        apiKey: "e2b-api-key",
        companyId: "company-1",
        description: null,
        id: "compute-provider-definition-1",
        name: "Primary E2B",
        provider: "e2b" as const,
      };
    },
  };
}

function createConfig() {
  return {
    companyhelm: {
      e2b: {
        desktop_resolution: {
          height: 1080,
          width: 1920,
        },
        template_prefix: "realequityapps/",
      },
    },
  };
}

function createEnvironmentRecord(templateId = "medium") {
  return {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: templateId === "small" ? 1 : 2,
    createdAt: new Date("2026-04-07T00:00:00.000Z"),
    diskSpaceGb: 20,
    displayName: templateId === "small" ? "Small sandbox" : "Medium sandbox",
    id: "environment-1",
    lastSeenAt: null,
    memoryGb: templateId === "small" ? 2 : 4,
    metadata: {},
    platform: "linux" as const,
    provider: "e2b" as const,
    providerDefinitionId: "compute-provider-definition-1",
    providerEnvironmentId: "e2b-environment-1",
    templateId,
    updatedAt: new Date("2026-04-07T00:00:00.000Z"),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("AgentComputeE2bProvider resolves templates from the local manager catalog", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  const provider = new AgentComputeE2bProvider(
    createConfig() as never,
    createComputeProviderDefinitionService() as never,
  );

  const templates = await provider.getTemplates({} as never, {
    companyId: "company-1",
    providerDefinitionId: "compute-provider-definition-1",
  });

  assert.deepEqual(templates, [
    {
      computerUse: false,
      cpuCount: 8,
      diskSpaceGb: 20,
      memoryGb: 8,
      name: "large",
      templateId: "large",
    },
    {
      computerUse: true,
      cpuCount: 2,
      diskSpaceGb: 20,
      memoryGb: 4,
      name: "medium",
      templateId: "medium",
    },
    {
      computerUse: false,
      cpuCount: 1,
      diskSpaceGb: 20,
      memoryGb: 2,
      name: "small",
      templateId: "small",
    },
  ]);
  assert.equal(fetchSpy.mock.calls.length, 0);
});

test("AgentComputeE2bProvider provisions computer-use environments through the desktop SDK", async () => {
  const getInfo = vi.fn(async () => ({
    cpuCount: 8,
    memoryMB: 12 * 1024,
  }));
  const kill = vi.fn(async () => undefined);
  const desktopCreate = vi.spyOn(DesktopSandbox, "create").mockResolvedValue({
    getInfo,
    kill,
    sandboxId: "e2b-environment-1",
  } as never);
  const create = vi.spyOn(Sandbox, "create");
  const provider = new AgentComputeE2bProvider(
    createConfig() as never,
    createComputeProviderDefinitionService() as never,
  );

  const provisionedEnvironment = await provider.provisionEnvironment({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    providerDefinitionId: "compute-provider-definition-1",
    sessionId: "session-1",
    template: {
      computerUse: true,
      cpuCount: 2,
      diskSpaceGb: 20,
      memoryGb: 4,
      name: "medium",
      templateId: "medium",
    },
  });

  assert.equal(provider.getProvider(), "e2b");
  assert.equal(provider.supportsOnDemandProvisioning(), true);
  assert.equal(desktopCreate.mock.calls.length, 1);
  assert.equal(create.mock.calls.length, 0);
  assert.equal(desktopCreate.mock.calls[0]?.[0], "realequityapps/medium");
  assert.deepEqual(desktopCreate.mock.calls[0]?.[1], {
    apiKey: "e2b-api-key",
    display: ":0",
    dpi: 96,
    lifecycle: {
      autoResume: true,
      onTimeout: "pause",
    },
    metadata: {
      agentId: "agent-1",
      companyId: "company-1",
      sessionId: "session-1",
    },
    resolution: [1920, 1080],
    timeoutMs: 15 * 60 * 1000,
  });
  assert.equal(getInfo.mock.calls.length, 1);
  assert.equal(provisionedEnvironment.providerEnvironmentId, "e2b-environment-1");
  assert.equal(provisionedEnvironment.platform, "linux");
  assert.deepEqual(provisionedEnvironment.metadata, {});
  assert.equal(provisionedEnvironment.cpuCount, 8);
  assert.equal(provisionedEnvironment.diskSpaceGb, 20);
  assert.equal(provisionedEnvironment.memoryGb, 12);
});

test("AgentComputeE2bProvider provisions non-computer-use environments through the generic SDK", async () => {
  const getInfo = vi.fn(async () => ({
    cpuCount: 1,
    memoryMB: 2048,
  }));
  const kill = vi.fn(async () => undefined);
  const create = vi.spyOn(Sandbox, "create").mockResolvedValue({
    getInfo,
    kill,
    sandboxId: "e2b-environment-1",
  } as never);
  const desktopCreate = vi.spyOn(DesktopSandbox, "create");
  const provider = new AgentComputeE2bProvider(
    createConfig() as never,
    createComputeProviderDefinitionService() as never,
  );

  const provisionedEnvironment = await provider.provisionEnvironment({} as never, {
    agentId: "agent-1",
    companyId: "company-1",
    providerDefinitionId: "compute-provider-definition-1",
    sessionId: "session-1",
    template: {
      computerUse: false,
      cpuCount: 1,
      diskSpaceGb: 20,
      memoryGb: 2,
      name: "small",
      templateId: "small",
    },
  });

  assert.equal(create.mock.calls.length, 1);
  assert.equal(desktopCreate.mock.calls.length, 0);
  assert.equal(create.mock.calls[0]?.[0], "realequityapps/small");
  assert.equal(provisionedEnvironment.memoryGb, 2);
});

test("AgentComputeE2bProvider starts desktop streaming on demand and returns the stream URL", async () => {
  const start = vi.fn(async () => undefined);
  const getUrl = vi.fn(() => "https://desktop.example/vnc");
  const getHost = vi.fn(() => "desktop.example");
  const waitAndVerify = vi.fn(async () => true);
  const connect = vi.spyOn(DesktopSandbox, "connect").mockResolvedValue({
    commands: {
      run: vi.fn(async () => ({
        exitCode: 0,
        stderr: "",
        stdout: "user 202 xfce4-session",
      })),
    },
    display: ":0",
    getHost,
    stream: {
      getUrl,
      start,
    },
    waitAndVerify,
  } as never);
  const provider = new AgentComputeE2bProvider(
    createConfig() as never,
    createComputeProviderDefinitionService() as never,
  );

  const url = await provider.getVncUrl({} as never, createEnvironmentRecord());

  assert.equal(url, "https://desktop.example/vnc");
  assert.equal(connect.mock.calls.length, 1);
  assert.deepEqual(connect.mock.calls[0], [
    "e2b-environment-1",
    {
      apiKey: "e2b-api-key",
      requestTimeoutMs: 15_000,
      timeoutMs: 15 * 60 * 1000,
    },
  ]);
  assert.equal(start.mock.calls.length, 1);
  assert.equal(getUrl.mock.calls.length, 1);
  assert.equal(waitAndVerify.mock.calls.length, 1);
  assert.equal(waitAndVerify.mock.calls[0]?.[0], "xdpyinfo -display :0");
  assert.equal(typeof waitAndVerify.mock.calls[0]?.[1], "function");
  assert.equal(waitAndVerify.mock.calls[0]?.[2], 1);
  assert.equal(waitAndVerify.mock.calls[0]?.[3], 0.25);
});

test("AgentComputeE2bProvider bootstraps the desktop runtime when a reconnected sandbox has no display", async () => {
  const start = vi.fn(async () => undefined);
  const run = vi.fn()
    .mockResolvedValueOnce({
      pid: 101,
    })
    .mockRejectedValueOnce(new CommandExitError({
      error: "exit status 1",
      exitCode: 1,
      stderr: "",
      stdout: "",
    }))
    .mockResolvedValueOnce({
      pid: 202,
    })
    .mockResolvedValueOnce({
      exitCode: 0,
      stderr: "",
      stdout: "user 202 xfce4-session",
    });
  const connect = vi.spyOn(DesktopSandbox, "connect").mockResolvedValue({
    commands: {
      run,
    },
    display: ":0",
    getHost: vi.fn(() => "desktop.example"),
    stream: {
      getUrl: vi.fn(() => "https://desktop.example/vnc"),
      start,
    },
    waitAndVerify: vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true),
  } as never);
  const provider = new AgentComputeE2bProvider(
    createConfig() as never,
    createComputeProviderDefinitionService() as never,
  );

  const url = await provider.getVncUrl({} as never, createEnvironmentRecord());

  assert.equal(url, "https://desktop.example/vnc");
  assert.equal(connect.mock.calls.length, 1);
  assert.equal(run.mock.calls.length, 4);
  assert.deepEqual(run.mock.calls[0], [
    "Xvfb :0 -ac -screen 0 1920x1080x24 -retro -dpi 96 -nolisten tcp -nolisten unix",
    {
      background: true,
      timeoutMs: 0,
    },
  ]);
  assert.deepEqual(run.mock.calls[2], [
    "startxfce4",
    {
      background: true,
      envs: {
        DISPLAY: ":0",
      },
      timeoutMs: 0,
    },
  ]);
});

test("AgentComputeE2bProvider reuses an already running stream by reconstructing the stream URL", async () => {
  const start = vi.fn(async () => {
    throw new Error("Stream is already running");
  });
  const getUrl = vi.fn(() => "https://desktop.example/unused");
  vi.spyOn(DesktopSandbox, "connect").mockResolvedValue({
    commands: {
      run: vi.fn(async () => ({
        exitCode: 0,
        stderr: "",
        stdout: "user 202 xfce4-session",
      })),
    },
    display: ":0",
    getHost: vi.fn(() => "desktop.example"),
    stream: {
      getUrl,
      start,
    },
    waitAndVerify: vi.fn(async () => true),
  } as never);
  const provider = new AgentComputeE2bProvider(
    createConfig() as never,
    createComputeProviderDefinitionService() as never,
  );

  const url = await provider.getVncUrl({} as never, createEnvironmentRecord());

  assert.equal(url, "https://desktop.example/vnc.html?autoconnect=true&resize=scale");
  assert.equal(getUrl.mock.calls.length, 0);
});

test("AgentComputeE2bProvider rejects desktop streaming for non-computer-use templates", async () => {
  const connect = vi.spyOn(DesktopSandbox, "connect");
  const provider = new AgentComputeE2bProvider(
    createConfig() as never,
    createComputeProviderDefinitionService() as never,
  );

  await assert.rejects(
    async () => {
      await provider.getVncUrl({} as never, createEnvironmentRecord("small"));
    },
    /does not support desktop streaming/,
  );

  assert.equal(connect.mock.calls.length, 0);
});

test("AgentComputeE2bProvider throws an actionable error when the environment lacks desktop binaries", async () => {
  const connect = vi.spyOn(DesktopSandbox, "connect").mockResolvedValue({
    commands: {
      run: vi.fn(async () => ({
        exitCode: 0,
        stderr: "",
        stdout: "user 202 xfce4-session",
      })),
    },
    display: ":0",
    getHost: vi.fn(() => "desktop.example"),
    stream: {
      getUrl: vi.fn(() => "https://desktop.example/vnc"),
      start: vi.fn(async () => {
        throw new CommandExitError({
          error: "exit status 127",
          exitCode: 127,
          stderr: "",
          stdout: "",
        });
      }),
    },
    waitAndVerify: vi.fn(async () => true),
  } as never);
  const provider = new AgentComputeE2bProvider(
    createConfig() as never,
    createComputeProviderDefinitionService() as never,
  );

  await assert.rejects(
    async () => {
      await provider.getVncUrl({} as never, createEnvironmentRecord());
    },
    /could not start its desktop runtime/,
  );

  assert.equal(connect.mock.calls.length, 1);
});

test("AgentComputeE2bProvider throws an actionable error when the display cannot be started", async () => {
  vi.spyOn(DesktopSandbox, "connect").mockResolvedValue({
    commands: {
      run: vi.fn().mockResolvedValue({
        pid: 101,
      }),
    },
    display: ":0",
    getHost: vi.fn(() => "desktop.example"),
    stream: {
      getUrl: vi.fn(() => "https://desktop.example/vnc"),
      start: vi.fn(async () => undefined),
    },
    waitAndVerify: vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false),
  } as never);
  const provider = new AgentComputeE2bProvider(
    createConfig() as never,
    createComputeProviderDefinitionService() as never,
  );

  await assert.rejects(
    async () => {
      await provider.getVncUrl({} as never, createEnvironmentRecord());
    },
    /could not start its desktop runtime/,
  );
});
