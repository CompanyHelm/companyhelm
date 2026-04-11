import type { AgentSkillActivationResult, AgentSkillSummary } from "./service.ts";

/**
 * Formats the session skill tool output into compact transcript text so the agent can inspect and
 * activate skills without reading raw database records.
 */
export class AgentSkillResultFormatter {
  static formatActivatedSkill(result: AgentSkillActivationResult): string {
    const lines = [
      `Activated skill ${result.skill.name}.`,
      `alreadyActive: ${result.alreadyActive ? "yes" : "no"}`,
      `files: ${AgentSkillResultFormatter.formatFiles(result.skill.files)}`,
      `description: ${result.skill.description}`,
    ];
    if (result.skill.files.length > 0) {
      lines.push(`repository: ${result.skill.repository ?? "(missing)"}`);
      lines.push(`skillDirectory: ${result.skill.skillDirectory ?? "(missing)"}`);
      lines.push(`githubTrackedCommitSha: ${result.skill.githubTrackedCommitSha ?? "(missing)"}`);
    }

    return lines.join("\n");
  }

  static formatSkillList(skills: AgentSkillSummary[]): string {
    if (skills.length === 0) {
      return "skills: none";
    }

    return skills.map((skill) => {
      const lines = [
        `name: ${skill.name}`,
        `active: ${skill.active ? "yes" : "no"}`,
        `files: ${AgentSkillResultFormatter.formatFiles(skill.files)}`,
        `description: ${skill.description}`,
      ];
      if (skill.files.length > 0) {
        lines.push(`repository: ${skill.repository ?? "(missing)"}`);
        lines.push(`skillDirectory: ${skill.skillDirectory ?? "(missing)"}`);
      }

      return lines.join("\n");
    }).join("\n\n");
  }

  private static formatFiles(files: string[]): string {
    return JSON.stringify(files);
  }
}
