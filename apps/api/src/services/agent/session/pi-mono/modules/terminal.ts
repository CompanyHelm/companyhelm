import type { Logger as PinoLogger } from "pino";
import type { Config } from "../../../../../config/schema.ts";
import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentTerminalToolProvider } from "../tools/terminal/provider.ts";
import { AgentReadImageToolService } from "../tools/terminal/read_image_service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Owns the terminal and patch-editing tool slice. It binds the session prompt scope once so the
 * shared shell tools remain available without the top-level session manager constructing them.
 */
export class TerminalSessionModule extends AgentSessionModuleInterface {
  private readonly config: Config;
  private readonly logger: PinoLogger;

  constructor(logger: PinoLogger, config: Config) {
    super();
    this.logger = logger;
    this.config = config;
  }

  getName(): string {
    return "terminal";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentTerminalToolProvider(
        context.promptScope,
        this.logger,
        new AgentReadImageToolService({
          defaultResolutionHeight: this.config.agent_tools.read_image.default_resolution.height,
          defaultResolutionWidth: this.config.agent_tools.read_image.default_resolution.width,
          maxReturnBytes: this.config.agent_tools.read_image.max_return_bytes,
          maxSourceBytes: this.config.agent_tools.read_image.max_source_bytes,
        }),
      ),
    ];
  }
}
