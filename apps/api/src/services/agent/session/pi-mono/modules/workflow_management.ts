import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentWorkflowToolProvider } from "../tools/workflows/provider.ts";
import { AgentWorkflowToolService } from "../tools/workflows/service.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";
import { WorkflowService } from "../../../../workflows/service.ts";

/**
 * Exposes workflow discovery and kickoff tools to every PI Mono session. These tools are safe for
 * ordinary chat sessions because they only list startable workflows and create new workflow runs.
 */
export class WorkflowManagementSessionModule extends AgentSessionModuleInterface {
  private readonly workflowService: WorkflowService;

  constructor(workflowService: WorkflowService) {
    super();
    this.workflowService = workflowService;
  }

  getName(): string {
    return "workflow_management";
  }

  async createAppendSystemPrompts(context: AgentSessionBootstrapContext): Promise<string[]> {
    void context;
    return [];
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
      context.agentId,
      context.sessionId,
      this.workflowService,
    );
  }
}
