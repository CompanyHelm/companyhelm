import assert from "node:assert/strict";
import { test } from "vitest";
import { E2bTemplatesManager } from "../src/compute/e2b/templates_manager.ts";

test("E2bTemplatesManager adds nvm-backed Node 25 setup to every template", () => {
  const manager = new E2bTemplatesManager();
  const mediumBuild = manager.findBuild("medium") as unknown as {
    template: {
      instructions: Array<{
        args: string[];
        type: string;
      }>;
    };
  };
  const smallBuild = manager.findBuild("small") as unknown as {
    template: {
      instructions: Array<{
        args: string[];
        type: string;
      }>;
    };
  };

  const mediumRunCommands = mediumBuild.template.instructions
    .filter((instruction) => instruction.type === "RUN")
    .map((instruction) => instruction.args[0] ?? "");
  const smallRunCommands = smallBuild.template.instructions
    .filter((instruction) => instruction.type === "RUN")
    .map((instruction) => instruction.args[0] ?? "");

  for (const runCommands of [mediumRunCommands, smallRunCommands]) {
    assert.ok(runCommands.some((command) => command.includes("git config --system user.name 'CompanyHelm Agent'")));
    assert.ok(runCommands.some((command) => command.includes("git config --system user.email 'agent@companyhelm.internal'")));
    assert.ok(runCommands.includes("curl -fsSL https://get.docker.com | sudo sh"));
    assert.ok(runCommands.some((command) => command.includes("nvm install 25")));
    assert.ok(runCommands.some((command) => command.includes("nvm alias default 25")));
    assert.ok(runCommands.some((command) => command.includes("/usr/local/bin/node")));
    assert.ok(runCommands.some((command) => command.includes("/etc/profile.d/companyhelm-nvm.sh")));
  }
});
