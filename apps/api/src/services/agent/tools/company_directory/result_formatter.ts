import type {
  AgentCompanyDirectoryAgent,
  AgentCompanyDirectoryMember,
} from "./service.ts";

/**
 * Renders company directory rows into compact transcript text so ids remain obvious for follow-up
 * tool calls while the listing stays readable inside the agent transcript.
 */
export class AgentCompanyDirectoryResultFormatter {
  static formatAgents(agents: AgentCompanyDirectoryAgent[]): string {
    if (agents.length === 0) {
      return "agents: none";
    }

    return agents.map((agent) => {
      return [
        `id: ${agent.id}`,
        `name: ${agent.name}`,
      ].join("\n");
    }).join("\n\n");
  }

  static formatMembers(members: AgentCompanyDirectoryMember[]): string {
    if (members.length === 0) {
      return "members: none";
    }

    return members.map((member) => {
      return [
        `id: ${member.id}`,
        `name: ${member.name}`,
        `email: ${member.email}`,
      ].join("\n");
    }).join("\n\n");
  }
}
