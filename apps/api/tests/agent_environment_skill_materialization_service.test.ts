import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentEnvironmentSkillCheckoutCacheService } from "../src/services/environments/skills/checkout_cache_service.ts";
import { AgentEnvironmentSkillMaterializationService } from "../src/services/environments/skills/materialization_service.ts";

const fileBackedSkillRecord = {
  companyId: "company-123",
  description: "Browser automation guidance.",
  fileList: ["skills/browser/scripts/open.sh"],
  githubBranchName: "main",
  githubTrackedCommitSha: "commit-sha-1",
  id: "skill-1",
  instructions: "Use the browser skill when working on websites.",
  name: "Browser skill",
  repository: "companyhelm/skills",
  skillDirectory: "skills/browser",
  skillGroupId: null,
};

test("AgentEnvironmentSkillCheckoutCacheService fetches one tracked commit and checks out only the declared files", async () => {
  const executeCommand = vi.fn(async (_command: string) => ({
    exitCode: 0,
    stdout: "",
  }));
  const service = new AgentEnvironmentSkillCheckoutCacheService();

  await service.prepareCheckout({
    executeCommand,
  } as never, fileBackedSkillRecord);

  const command = String(executeCommand.mock.calls[0]?.[0] ?? "");
  assert.match(command, /git -C "\$checkout_dir" fetch --depth 1 --filter=blob:none origin "\$commit_sha"/);
  assert.match(command, /git -C "\$checkout_dir" checkout --force "\$commit_sha" --/);
  assert.match(command, /skills\/browser\/SKILL\.md/);
  assert.match(command, /skills\/browser\/scripts\/open\.sh/);
  assert.match(command, /https:\/\/github\.com\/companyhelm\/skills\.git/);
});

test("AgentEnvironmentSkillMaterializationService copies SKILL.md and each declared file into the session skill directory", async () => {
  const executeCommand = vi.fn(async (_command: string) => ({
    exitCode: 0,
    stdout: "",
  }));
  const service = new AgentEnvironmentSkillMaterializationService({
    async prepareCheckout() {
      return undefined;
    },
  } as never);

  await service.materializeSkill({
    executeCommand,
  } as never, fileBackedSkillRecord);

  const command = String(executeCommand.mock.calls[0]?.[0] ?? "");
  assert.match(command, /'~\/skills\/skill-1\/SKILL\.md'/);
  assert.match(command, /'~\/skills\/skill-1\/scripts\/open\.sh'/);
  assert.match(command, /'~\/\.companyhelm\/skill-cache\/companyhelm\/skills\/commit-sha-1\/checkout\/skills\/browser\/SKILL\.md'/);
});
