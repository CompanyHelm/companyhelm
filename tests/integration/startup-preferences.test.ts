import { beforeEach, expect, test, vi } from "vitest";
import { PassThrough } from "node:stream";

const promptState = vi.hoisted(() => ({
  note: vi.fn(),
  select: vi.fn(),
  isCancel: vi.fn(() => false),
  isTTY: vi.fn((output: { isTTY?: boolean }) => Boolean(output.isTTY)),
}));

vi.mock("@clack/prompts", () => ({
  note: promptState.note,
  select: promptState.select,
  isCancel: promptState.isCancel,
  isTTY: promptState.isTTY,
}));

import { ensureAgentWorkspaceMode } from "../../src/commands/startup-preferences.js";
import { LocalConfigStore } from "../../src/core/runtime/LocalConfigStore.js";

function createInteractiveStream(): PassThrough & { isTTY: boolean } {
  const stream = new PassThrough() as PassThrough & { isTTY: boolean };
  stream.isTTY = true;
  return stream;
}

beforeEach(() => {
  vi.restoreAllMocks();
  promptState.note.mockReset();
  promptState.select.mockReset();
  promptState.isCancel.mockClear();
  promptState.isTTY.mockClear();
});

test("prompts for and stores the agent workspace mode", async () => {
  const projectRoot = "/tmp/companyhelm-startup-preferences";
  const store = new LocalConfigStore(projectRoot);
  const input = createInteractiveStream();
  const output = createInteractiveStream();
  const setAgentWorkspaceMode = vi.spyOn(store, "setAgentWorkspaceMode").mockReturnValue({
    configPath: `${projectRoot}/config.yaml`,
    agentWorkspaceMode: "current-working-directory"
  });
  promptState.select.mockResolvedValue("current-working-directory");

  await expect(ensureAgentWorkspaceMode(store, input, output)).resolves.toBe("current-working-directory");

  expect(promptState.note).toHaveBeenCalled();
  expect(promptState.select).toHaveBeenCalledWith({
    message: "Where should agents operate?",
    options: [
      {
        value: "dedicated",
        label: "Dedicated workspaces directory",
        hint: "isolated thread workspaces"
      },
      {
        value: "current-working-directory",
        label: "Current working directory",
        hint: "agents work directly in this checkout"
      }
    ],
    initialValue: "dedicated",
    input,
    output
  });
  expect(setAgentWorkspaceMode).toHaveBeenCalledWith("current-working-directory");
});

test("defaults to dedicated mode without prompting outside a tty", async () => {
  const input = new PassThrough() as PassThrough & { isTTY: boolean };
  input.isTTY = false;
  const output = new PassThrough() as PassThrough & { isTTY: boolean };
  output.isTTY = false;
  const store = new LocalConfigStore("/tmp/companyhelm-startup-preferences");
  const setAgentWorkspaceMode = vi.spyOn(store, "setAgentWorkspaceMode");

  await expect(ensureAgentWorkspaceMode(store, input, output)).resolves.toBe("dedicated");

  expect(promptState.select).not.toHaveBeenCalled();
  expect(setAgentWorkspaceMode).not.toHaveBeenCalled();
});
