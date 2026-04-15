import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentSkillToolProvider } from "../tools/skills/provider.ts";
import { AgentSkillToolService } from "../tools/skills/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";
import { AgentSessionModulePromptTemplate } from "./prompt_template.ts";
import { SkillsSessionModulePromptContext } from "./skills_prompt_context.ts";

/**
 * Exposes the session skill catalog and activation tools so one chat run can opt into stored
 * CompanyHelm skills without mutating the wider company or agent defaults.
 */
export class SkillsSessionModule extends AgentSessionModuleInterface {
  getName(): string {
    return "skills";
  }

  async createAppendSystemPrompts(context: AgentSessionBootstrapContext): Promise<string[]> {
    const skillToolService = this.createSkillToolService(context);
    const availableSkills = await skillToolService.listAvailableSkills();
    const promptVisibleSkills = availableSkills.filter((skill) => skill.name.length > 0 && skill.description.length > 0);

    return [
      new AgentSessionModulePromptTemplate(this.getName()).render(
        new SkillsSessionModulePromptContext(
          context,
          promptVisibleSkills.filter((skill) => skill.active).map((skill) => {
            return {
              description: skill.description,
              name: skill.name,
            };
          }),
          promptVisibleSkills.map((skill) => {
            return {
              description: skill.description,
              name: skill.name,
            };
          }),
        ),
      ),
    ];
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentSkillToolProvider(
        this.createSkillToolService(context),
      ),
    ];
  }

  /**
   * Builds the session-bound skill service once per caller so prompts and tools read the same
   * company catalog while tests can override the data source without mocking broader session state.
   */
  protected createSkillToolService(context: AgentSessionBootstrapContext): AgentSkillToolService {
    return new AgentSkillToolService(
      context.transactionProvider,
      context.companyId,
      context.sessionId,
      context.agentId,
      context.promptScope,
    );
  }
}
