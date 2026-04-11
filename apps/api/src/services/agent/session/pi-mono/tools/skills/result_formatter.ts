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
      `materializedIntoLeasedEnvironment: ${result.materialized ? "yes" : "no"}`,
      `fileBacked: ${result.skill.fileBacked ? "yes" : "no"}`,
      `files: ${result.skill.fileCount}`,
      `description: ${result.skill.description}`,
    ];
    if (result.skill.fileBacked) {
      lines.push(`repository: ${result.skill.repository ?? "(missing)"}`);
      lines.push(`skillDirectory: ${result.skill.skillDirectory ?? "(missing)"}`);
      lines.push(`githubTrackedCommitSha: ${result.skill.githubTrackedCommitSha ?? "(missing)"}`);
      if (!result.materialized) {
        lines.push("note: The skill will be materialized the next time this session leases an environment.");
      }
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
        `fileBacked: ${skill.fileBacked ? "yes" : "no"}`,
        `files: ${skill.fileCount}`,
        `description: ${skill.description}`,
      ];
      if (skill.fileBacked) {
        lines.push(`repository: ${skill.repository ?? "(missing)"}`);
        lines.push(`skillDirectory: ${skill.skillDirectory ?? "(missing)"}`);
      }

      return lines.join("\n");
    }).join("\n\n");
  }
}
