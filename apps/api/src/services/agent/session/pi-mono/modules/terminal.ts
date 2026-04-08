import type { Logger as PinoLogger } from "pino";
import type { AgentToolProviderInterface } from "../../../tools/provider_interface.ts";
import { AgentTerminalToolProvider } from "../../../tools/terminal/provider.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Owns the terminal and patch-editing tool slice. It binds the session prompt scope once so the
 * shared shell tools remain available without the top-level session manager constructing them.
 */
export class TerminalSessionModule extends AgentSessionModuleInterface {
  private readonly logger: PinoLogger;

  constructor(logger: PinoLogger) {
    super();
    this.logger = logger;
  }

  getName(): string {
    return "terminal";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentTerminalToolProvider(context.promptScope, this.logger),
    ];
  }
}
