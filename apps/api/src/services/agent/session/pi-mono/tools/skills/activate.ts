import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentSkillResultFormatter } from "./result_formatter.ts";
import { AgentSkillToolService } from "./service.ts";

/**
 * Activates one skill for the current chat session and eagerly materializes any file-backed
 * payload into an already leased environment when one exists.
 */
export class AgentActivateSkillTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    skillName: Type.String({
      description: "The exact skill name to activate for this chat session.",
    }),
  });
  private readonly skillToolService: AgentSkillToolService;

  constructor(skillToolService: AgentSkillToolService) {
    this.skillToolService = skillToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentActivateSkillTool.parameters> {
    return {
      description:
        "Activate one skill by name for this chat session. File-backed skills are synchronized into an already leased environment immediately and otherwise materialize on the next lease.",
      execute: async (_toolCallId, params, _signal, _onUpdate, _ctx) => {
        const activation = await this.skillToolService.activateSkill(params.skillName);
        return {
          content: [{
            text: AgentSkillResultFormatter.formatActivatedSkill(activation),
            type: "text",
          }],
          details: {
            alreadyActive: activation.alreadyActive,
            fileBacked: activation.skill.fileBacked,
            materializedIntoLeasedEnvironment: activation.materialized,
            skillName: activation.skill.name,
          },
        };
      },
      label: "activate_skill",
      name: "activate_skill",
      parameters: AgentActivateSkillTool.parameters,
      promptGuidelines: [
        "Call list_available_skills first when you are not certain which skill name should be activated.",
        "Activate a skill only when its instructions are relevant to the current task.",
      ],
      promptSnippet: "Activate one skill for the current chat session",
    } as ToolDefinition<typeof AgentActivateSkillTool.parameters>;
  }
}
