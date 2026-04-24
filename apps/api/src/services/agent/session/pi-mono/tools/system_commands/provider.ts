import { SystemCommandService } from "../../../../../system_command_service.ts";
import { AgentSessionBootstrapContext } from "../../bootstrap_context.ts";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentSystemCommandTool } from "./system_command.ts";

/**
 * Registers the one generic system-command bridge. Individual platform commands stay out of the
 * startup tool catalog and are only described after their owning system skill is activated.
 */
export class AgentSystemCommandToolProvider extends AgentToolProviderInterface {
  private readonly bootstrapContext: AgentSessionBootstrapContext;
  private readonly systemCommandService: SystemCommandService;

  constructor(
    bootstrapContext: AgentSessionBootstrapContext,
    systemCommandService: SystemCommandService,
  ) {
    super();
    this.bootstrapContext = bootstrapContext;
    this.systemCommandService = systemCommandService;
  }

  createToolDefinitions(): unknown[] {
    return [
      new AgentSystemCommandTool(this.bootstrapContext, this.systemCommandService).createDefinition(),
    ];
  }
}
