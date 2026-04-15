import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentSkillResultFormatter } from "./result_formatter.ts";
import { AgentSkillToolService } from "./service.ts";

/**
 * Activates one skill for the current chat session so later prompts can rely on its instructions.
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
        "Activate one skill by name for this chat session.",
      execute: async (_toolCallId, params, signal, onUpdate, ctx) => {
        void signal;
        void onUpdate;
        void ctx;
        const activation = await this.skillToolService.activateSkill(params.skillName);
        return {
          content: [{
            text: AgentSkillResultFormatter.formatActivatedSkill(activation),
            type: "text",
          }],
          details: {
            alreadyActive: activation.alreadyActive,
            files: activation.skill.files,
            skillName: activation.skill.name,
          },
        };
      },
      label: "activate_skill",
      name: "activate_skill",
      parameters: AgentActivateSkillTool.parameters,
      promptGuidelines: [
        "Choose the skill name from the available-skills catalog in the prompt before activating it.",
        "Activate a skill only when its instructions are relevant to the current task.",
      ],
      promptSnippet: "Activate one skill for the current chat session",
    } as ToolDefinition<typeof AgentActivateSkillTool.parameters>;
  }
}
