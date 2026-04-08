import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Supplies the CompanyHelm-owned append-system-prompt layers that always apply to PI Mono. The
 * module contributes the shared core operating guidance plus any company or agent-specific prompt
 * overrides stored with the session runtime configuration.
 */
export class CorePromptSessionModule extends AgentSessionModuleInterface {
  getName(): string {
    return "core_prompt";
  }

  async createAppendSystemPrompts(context: AgentSessionBootstrapContext): Promise<string[]> {
    return [
      ...(await super.createAppendSystemPrompts(context)),
      context.companyBaseSystemPrompt,
      context.agentSystemPrompt,
    ].filter((prompt): prompt is string => {
      return typeof prompt === "string" && prompt.length > 0;
    });
  }
}
