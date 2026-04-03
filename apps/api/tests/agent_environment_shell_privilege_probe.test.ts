import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentEnvironmentShellPrivilegeProbe } from "../src/services/agent/compute/shell_privilege_probe.ts";

class FakeEnvironmentShell {
  readonly executedCommands = [] as string[];
  passwordlessSudo = false;
  rootUser = false;

  async executeCommand(command: string): Promise<{
    exitCode: number;
    stdout: string;
  }> {
    this.executedCommands.push(command);

    if (command === "id -u") {
      return {
        exitCode: 0,
        stdout: this.rootUser ? "0\n" : "1001\n",
      };
    }

    if (command === "sudo -n true") {
      return {
        exitCode: this.passwordlessSudo ? 0 : 1,
        stdout: "",
      };
    }

    throw new Error(`Unhandled shell command: ${command}`);
  }
}

test("AgentEnvironmentShellPrivilegeProbe caches root detection", async () => {
  const fakeEnvironmentShell = new FakeEnvironmentShell();
  fakeEnvironmentShell.rootUser = true;
  const probe = new AgentEnvironmentShellPrivilegeProbe(fakeEnvironmentShell as never);

  const firstResult = await probe.getPrivilegeMode();
  const secondResult = await probe.getPrivilegeMode();

  assert.equal(firstResult, "root");
  assert.equal(secondResult, "root");
  assert.deepEqual(fakeEnvironmentShell.executedCommands, ["id -u"]);
});

test("AgentEnvironmentShellPrivilegeProbe caches passwordless sudo detection", async () => {
  const fakeEnvironmentShell = new FakeEnvironmentShell();
  fakeEnvironmentShell.passwordlessSudo = true;
  const probe = new AgentEnvironmentShellPrivilegeProbe(fakeEnvironmentShell as never);

  const firstResult = await probe.getPrivilegeMode();
  const secondResult = await probe.getPrivilegeMode();

  assert.equal(firstResult, "passwordless-sudo");
  assert.equal(secondResult, "passwordless-sudo");
  assert.deepEqual(fakeEnvironmentShell.executedCommands, [
    "id -u",
    "sudo -n true",
  ]);
});

test("AgentEnvironmentShellPrivilegeProbe caches unprivileged detection", async () => {
  const fakeEnvironmentShell = new FakeEnvironmentShell();
  const probe = new AgentEnvironmentShellPrivilegeProbe(fakeEnvironmentShell as never);

  const firstResult = await probe.getPrivilegeMode();
  const secondResult = await probe.getPrivilegeMode();

  assert.equal(firstResult, "unprivileged");
  assert.equal(secondResult, "unprivileged");
  assert.deepEqual(fakeEnvironmentShell.executedCommands, [
    "id -u",
    "sudo -n true",
  ]);
});
