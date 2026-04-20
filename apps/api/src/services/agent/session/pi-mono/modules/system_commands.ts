import { SystemCommandService } from "../../../../system_command_service.ts";
import { WorkflowService } from "../../../../workflows/service.ts";
import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentSystemCommandToolProvider } from "../tools/system_commands/provider.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Adds the compact system_command bridge used by activated system skills. The module does not
 * register individual command schemas, preserving progressive discovery for built-in capabilities.
 */
export class SystemCommandsSessionModule extends AgentSessionModuleInterface {
  private readonly workflowService: WorkflowService;

  constructor(workflowService: WorkflowService) {
    super();
    this.workflowService = workflowService;
  }

  getName(): string {
    return "system_commands";
  }

  async createAppendSystemPrompts(): Promise<string[]> {
    return [];
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentSystemCommandToolProvider(
        context,
        new SystemCommandService({
          workflowService: this.workflowService,
        }),
      ),
    ];
  }
}
