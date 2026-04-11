import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentSkillToolProvider } from "../tools/skills/provider.ts";
import { AgentSkillToolService } from "../tools/skills/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Exposes the session skill catalog and activation tools so one chat run can opt into stored
 * CompanyHelm skills without mutating the wider company or agent defaults.
 */
export class SkillsSessionModule extends AgentSessionModuleInterface {
  getName(): string {
    return "skills";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentSkillToolProvider(
        new AgentSkillToolService(
          context.transactionProvider,
          context.companyId,
          context.sessionId,
          context.agentId,
          context.promptScope,
        ),
      ),
    ];
  }
}
