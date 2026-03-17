import * as clack from "@clack/prompts";
import type { Readable, Writable } from "node:stream";

import { unwrapPromptResult, hasInteractiveTerminal } from "./interactive.js";
import { LocalConfigStore, type AgentWorkspaceMode } from "../core/runtime/LocalConfigStore.js";

const DEFAULT_WORKSPACE_MODE: AgentWorkspaceMode = "dedicated";

export async function ensureAgentWorkspaceMode(
  store = new LocalConfigStore(),
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): Promise<AgentWorkspaceMode> {
  const existingMode = store.load().agentWorkspaceMode;
  if (existingMode) {
    return existingMode;
  }

  if (!hasInteractiveTerminal(input, output)) {
    return DEFAULT_WORKSPACE_MODE;
  }

  clack.note(
    [
      "Choose where agent threads should run.",
      "Dedicated workspaces keep agents isolated from your host filesystem.",
      "In dedicated mode agents will not have access to files on your system, so GitHub auth is recommended if you want them to clone your repositories.",
      "Current working directory mode mounts this checkout directly into agent threads.",
    ].join("\n"),
    "Agent workspace",
    { output },
  );

  const selectedMode = unwrapPromptResult(
    await clack.select({
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
      initialValue: DEFAULT_WORKSPACE_MODE,
      input,
      output
    }),
    "Workspace selection cancelled.",
    output,
  ) as AgentWorkspaceMode;

  store.setAgentWorkspaceMode(selectedMode);
  return selectedMode;
}
