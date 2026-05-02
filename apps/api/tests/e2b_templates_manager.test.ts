import assert from "node:assert/strict";
import { test } from "vitest";
import { E2bTemplatesManager } from "../src/compute/e2b/templates_manager.ts";

test("E2bTemplatesManager adds pinned official GitHub CLI and nvm-backed Node 25 setup to every template", () => {
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
  const mediumInstructions = JSON.stringify(mediumBuild.template.instructions);
  const smallInstructions = JSON.stringify(smallBuild.template.instructions);

  for (const [instructions, runCommands] of [
    [mediumInstructions, mediumRunCommands],
    [smallInstructions, smallRunCommands],
  ] as const) {
    assert.match(instructions, /awscli/);
    assert.doesNotMatch(instructions, /"gh"/);
    assert.ok(runCommands.some((command) => command.includes("git config --global user.name 'CompanyHelm Agent'")));
    assert.ok(runCommands.some((command) => command.includes("git config --global user.email 'agent@companyhelm.internal'")));
    assert.ok(runCommands.some((command) => command.includes("https://github.com/cli/cli/releases/download")));
    assert.ok(runCommands.some((command) => command.includes('GH_VERSION="2.88.1"')));
    assert.ok(runCommands.some((command) => command.includes('GH_ARCH="$(dpkg --print-architecture)"')));
    assert.ok(runCommands.some((command) => command.includes('GH_DEB="gh_${GH_VERSION}_linux_${GH_ASSET_ARCH}.deb"')));
    assert.ok(runCommands.some((command) => command.includes('apt install -y "/tmp/${GH_DEB}"')));
    assert.ok(runCommands.includes("curl -fsSL https://get.docker.com | sudo sh"));
    assert.ok(runCommands.includes("sudo usermod -aG docker user"));
    assert.ok(runCommands.some((command) => command.includes("nvm install 25")));
    assert.ok(runCommands.some((command) => command.includes("nvm alias default 25")));
    assert.ok(runCommands.some((command) => command.includes("npm install -g @playwright/cli@latest")));
    assert.ok(runCommands.some((command) => command.includes("npx playwright install ffmpeg")));
    assert.ok(runCommands.some((command) => command.includes("/usr/local/bin/node")));
    assert.ok(runCommands.some((command) => command.includes("/usr/local/bin/playwright")));
    assert.ok(runCommands.some((command) => command.includes("/etc/profile.d/companyhelm-nvm.sh")));
  }
});
