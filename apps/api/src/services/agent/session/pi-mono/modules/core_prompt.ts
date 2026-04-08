import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Supplies the CompanyHelm-owned append-system-prompt layers that should always wrap the shared
 * system prompt template. Keeping these two prompt sources in their own module makes later
 * capability-specific prompt additions fit the same assembly path as tool modules.
 */
export class CorePromptSessionModule extends AgentSessionModuleInterface {
  getName(): string {
    return "core_prompt";
  }

  async createAppendSystemPrompts(context: AgentSessionBootstrapContext): Promise<string[]> {
    return [
      context.companyBaseSystemPrompt,
      context.agentSystemPrompt,
    ].filter((prompt): prompt is string => {
      return typeof prompt === "string" && prompt.length > 0;
    });
  }
}
