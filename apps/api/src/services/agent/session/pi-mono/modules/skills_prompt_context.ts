import type { AgentSkillSummary } from "../tools/skills/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModulePromptContext } from "./prompt_context.ts";

export type ActiveSystemSkillPromptRecord = {
  instructions: string;
  name: string;
  systemCommands: Array<{
    description: string;
    id: string;
    inputSchemaJson: string;
  }>;
  systemKey: string | null;
};

/**
 * Extends the shared module prompt context with the session-visible skill catalog so the skills
 * prompt can name the exact skills the agent may activate without forcing a discovery tool call.
 */
export class SkillsSessionModulePromptContext extends AgentSessionModulePromptContext {
  readonly activeSkills: Array<Pick<AgentSkillSummary, "description" | "name">>;
  readonly activeSystemSkills: ActiveSystemSkillPromptRecord[];
  readonly availableSkills: Array<Pick<AgentSkillSummary, "description" | "name">>;

  constructor(
    context: AgentSessionBootstrapContext,
    activeSkills: Array<Pick<AgentSkillSummary, "description" | "name">>,
    activeSystemSkills: ActiveSystemSkillPromptRecord[],
    availableSkills: Array<Pick<AgentSkillSummary, "description" | "name">>,
  ) {
    super(context);
    this.activeSkills = activeSkills;
    this.activeSystemSkills = activeSystemSkills;
    this.availableSkills = availableSkills;
  }
}
