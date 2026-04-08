import { AgentComputeE2bComputerUseToolProvider } from "../../../../../compute/e2b/tools/computer-use/provider.ts";
import { AgentComputeE2bComputerUseToolService } from "../../../../../compute/e2b/tools/computer-use/service.ts";
import { ComputeProviderDefinitionService } from "../../../../compute_provider_definitions/service.ts";
import { AgentComputeE2bDesktopSandboxService } from "../../../../environments/providers/e2b/desktop_sandbox_service.ts";
import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Activates the E2B desktop computer-use tool catalog only for sessions whose selected environment
 * template explicitly advertises desktop interaction support.
 */
export class ComputerUseSessionModule extends AgentSessionModuleInterface {
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;

  constructor(computeProviderDefinitionService: ComputeProviderDefinitionService) {
    super();
    this.computeProviderDefinitionService = computeProviderDefinitionService;
  }

  getName(): string {
    return "computer_use";
  }

  async shouldApply(context: AgentSessionBootstrapContext): Promise<boolean> {
    return context.environmentProvider === "e2b" && context.isComputerUseEnabled();
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentComputeE2bComputerUseToolProvider(
        new AgentComputeE2bComputerUseToolService(
          context.transactionProvider,
          context.promptScope,
          new AgentComputeE2bDesktopSandboxService(this.computeProviderDefinitionService),
        ),
      ),
    ];
  }
}
