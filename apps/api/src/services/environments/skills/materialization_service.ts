import { dirname } from "node:path/posix";
import { injectable } from "inversify";
import { AgentEnvironmentShellInterface } from "../providers/shell_interface.ts";
import { AgentEnvironmentSkillCheckoutCacheService } from "./checkout_cache_service.ts";
import { AgentEnvironmentSkillPathService } from "./path_service.ts";
import type { SkillRecord } from "../../skills/service.ts";

/**
 * Copies one file-backed skill from the shared cache into the environment-facing skill directory
 * under the remote user's home. It materializes only the declared files plus `SKILL.md`, keeping
 * unrelated repository content out of the runtime.
 */
@injectable()
export class AgentEnvironmentSkillMaterializationService {
  private readonly checkoutCacheService: AgentEnvironmentSkillCheckoutCacheService;
  private readonly pathService: AgentEnvironmentSkillPathService;

  constructor(
    checkoutCacheService: AgentEnvironmentSkillCheckoutCacheService = new AgentEnvironmentSkillCheckoutCacheService(),
    pathService: AgentEnvironmentSkillPathService = new AgentEnvironmentSkillPathService(),
  ) {
    this.checkoutCacheService = checkoutCacheService;
    this.pathService = pathService;
  }

  async materializeSkill(
    environmentShell: AgentEnvironmentShellInterface,
    skill: SkillRecord,
  ): Promise<void> {
    const fileBackedSkill = this.pathService.resolveFileBackedSkill(skill);
    if (!fileBackedSkill) {
      return;
    }

    await this.checkoutCacheService.prepareCheckout(environmentShell, skill);

    const materializationDirectory = this.pathService.getSkillMaterializationDirectory(skill.name);
    const copyInstructions = [{
      sourcePath: this.pathService.getSkillDocumentCheckoutPath(fileBackedSkill),
      targetPath: `${materializationDirectory}/SKILL.md`,
    }, ...skill.fileList.map((repositoryPath) => {
      const relativePath = this.pathService.toSkillRelativePath(fileBackedSkill, repositoryPath);
      return {
        sourcePath: this.pathService.getSkillFileCheckoutPath(fileBackedSkill, repositoryPath),
        targetPath: `${materializationDirectory}/${relativePath}`,
      };
    })];
    const scriptLines = [
      "set -eu",
      `target_dir=${AgentEnvironmentSkillMaterializationService.shellQuote(materializationDirectory)}`,
      "rm -rf \"$target_dir\"",
      "mkdir -p \"$target_dir\"",
      ...copyInstructions.flatMap((copyInstruction) => {
        const targetDirectory = dirname(copyInstruction.targetPath);
        return [
          `mkdir -p ${AgentEnvironmentSkillMaterializationService.shellQuote(targetDirectory)}`,
          [
            "cp -p",
            AgentEnvironmentSkillMaterializationService.shellQuote(copyInstruction.sourcePath),
            AgentEnvironmentSkillMaterializationService.shellQuote(copyInstruction.targetPath),
          ].join(" "),
        ];
      }),
    ];
    const result = await environmentShell.executeCommand(
      `bash -lc ${AgentEnvironmentSkillMaterializationService.shellQuote(scriptLines.join("\n"))}`,
    );
    if (result.exitCode !== 0) {
      throw new Error(`Failed to materialize file-backed skill ${skill.name}: ${result.stdout}`);
    }
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }
}
