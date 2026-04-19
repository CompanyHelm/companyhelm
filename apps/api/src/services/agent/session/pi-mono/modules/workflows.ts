import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentWorkflowToolProvider } from "../tools/workflows/provider.ts";
import { AgentWorkflowToolService } from "../tools/workflows/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Adds workflow execution helpers only when the current session is tied to a running workflow run.
 * Ordinary chat sessions never see the workflow step advancement tool.
 */
export class WorkflowsSessionModule extends AgentSessionModuleInterface {
  getName(): string {
    return "workflows";
  }

  async shouldApply(context: AgentSessionBootstrapContext): Promise<boolean> {
    return this.createWorkflowToolService(context).hasRunningWorkflowRun();
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentWorkflowToolProvider(this.createWorkflowToolService(context)),
    ];
  }

  private createWorkflowToolService(context: AgentSessionBootstrapContext): AgentWorkflowToolService {
    return new AgentWorkflowToolService(
      context.transactionProvider,
      context.companyId,
      context.sessionId,
    );
  }
}
