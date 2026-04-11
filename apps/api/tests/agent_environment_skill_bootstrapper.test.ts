import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentEnvironmentSkillBootstrapper } from "../src/services/environments/skills/bootstrapper.ts";

test("AgentEnvironmentSkillBootstrapper creates concrete home-directory skill roots", async () => {
  const executeCommand = vi.fn(async (command: string) => {
    void command;
    return {
      exitCode: 0,
      stdout: "",
    };
  });
  const bootstrapper = new AgentEnvironmentSkillBootstrapper();

  await bootstrapper.bootstrap({
    executeCommand,
  } as never);

  const command = String(executeCommand.mock.calls[0]?.[0] ?? "");
  assert.match(command, /\/home\/user\/\.companyhelm\/skill-cache/);
  assert.match(command, /\/home\/user\/skills/);
  assert.doesNotMatch(command, /~\/skills/);
});
