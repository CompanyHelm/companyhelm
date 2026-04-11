import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentSkillResultFormatter } from "./result_formatter.ts";
import { AgentSkillToolService } from "./service.ts";

/**
 * Lists the company skill catalog with the current session activation state so the agent can pick
 * a skill by name before calling `activate_skill`.
 */
export class AgentListAvailableSkillsTool {
  private static readonly parameters = AgentToolParameterSchema.object({});
  private readonly skillToolService: AgentSkillToolService;

  constructor(skillToolService: AgentSkillToolService) {
    this.skillToolService = skillToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentListAvailableSkillsTool.parameters> {
    return {
      description:
        "List all skills available to this company and whether each one is already active for the current chat session.",
      execute: async (_toolCallId, _params, _signal, _onUpdate, _ctx) => {
        const skills = await this.skillToolService.listAvailableSkills();
        return {
          content: [{
            text: AgentSkillResultFormatter.formatSkillList(skills),
            type: "text",
          }],
        };
      },
      label: "list_available_skills",
      name: "list_available_skills",
      parameters: AgentListAvailableSkillsTool.parameters,
      promptGuidelines: [
        "Use list_available_skills before activate_skill when you do not already know the exact skill name to activate.",
      ],
      promptSnippet: "List the available session skills",
    } as ToolDefinition<typeof AgentListAvailableSkillsTool.parameters>;
  }
}
