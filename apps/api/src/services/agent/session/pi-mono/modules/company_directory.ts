import type { AgentToolProviderInterface } from "../../../tools/provider_interface.ts";
import { AgentCompanyDirectoryToolProvider } from "../../../tools/company_directory/provider.ts";
import { AgentCompanyDirectoryToolService } from "../../../tools/company_directory/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Supplies the company-directory tool slice that lets an agent inspect coworkers and other agents
 * inside its own organization without the session manager wiring those tools directly.
 */
export class CompanyDirectorySessionModule extends AgentSessionModuleInterface {
  getName(): string {
    return "company_directory";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentCompanyDirectoryToolProvider(
        new AgentCompanyDirectoryToolService(
          context.transactionProvider,
          context.companyId,
        ),
      ),
    ];
  }
}
