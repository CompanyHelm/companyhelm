import type { AgentSkillSummary } from "../tools/skills/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModulePromptContext } from "./prompt_context.ts";

/**
 * Extends the shared module prompt context with the session-visible skill catalog so the skills
 * prompt can name the exact skills the agent may activate without forcing a discovery tool call.
 */
export class SkillsSessionModulePromptContext extends AgentSessionModulePromptContext {
  readonly activeSkills: Array<Pick<AgentSkillSummary, "description" | "name">>;
  readonly availableSkills: Array<Pick<AgentSkillSummary, "description" | "name">>;

  constructor(
    context: AgentSessionBootstrapContext,
    activeSkills: Array<Pick<AgentSkillSummary, "description" | "name">>,
    availableSkills: Array<Pick<AgentSkillSummary, "description" | "name">>,
  ) {
    super(context);
    this.activeSkills = activeSkills;
    this.availableSkills = availableSkills;
  }
}
