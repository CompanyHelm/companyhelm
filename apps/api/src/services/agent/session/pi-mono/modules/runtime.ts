import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentRuntimeToolProvider } from "../tools/runtime/provider.ts";
import { AgentRuntimeToolService } from "../tools/runtime/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Owns runtime-wide control helpers that do not depend on one specific provider integration. These
 * tools stay available across all sessions so the agent can pace work even when no provider-specific
 * wait primitive applies.
 */
export class RuntimeSessionModule extends AgentSessionModuleInterface {
  getName(): string {
    return "runtime";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    void context;
    return [
      new AgentRuntimeToolProvider(new AgentRuntimeToolService()),
    ];
  }
}
