import type { AgentEnvironmentCommandResult } from "../../../../../environments/providers/environment_interface.ts";
import type { AgentGithubInstallation } from "./installation_service.ts";

/**
 * Formats GitHub tool payloads into concise text blocks for transcript persistence while keeping
 * the actual tool classes focused on orchestration and token handling.
 */
export class AgentGithubResultFormatter {
  static formatExecResult(result: AgentEnvironmentCommandResult): string {
    const output = result.output.replace(/(?:\r?\n[ \t]*)+$/u, "");
    return output.length > 0 ? output : "(no output)";
  }

  static formatInstallationList(installations: AgentGithubInstallation[]): string {
    if (installations.length === 0) {
      return "No GitHub installations are linked to this company.";
    }

    return installations.map((installation) => {
      const repositories = installation.repositories.length > 0
        ? installation.repositories.map((repository) => {
          return `- ${repository.fullName}${repository.archived ? " (archived)" : ""}`;
        }).join("\n")
        : "- No repositories cached for this installation.";

      return [
        `installationId: ${installation.installationId}`,
        `createdAt: ${installation.createdAt.toISOString()}`,
        "repositories:",
        repositories,
      ].join("\n");
    }).join("\n\n");
  }
}
