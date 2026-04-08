import type { AgentToolProviderInterface } from "../../../tools/provider_interface.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

export type AgentSessionModuleRegistryResolution = {
  appendSystemPrompts: string[];
  toolProviders: AgentToolProviderInterface[];
};

/**
 * Evaluates the registered session modules in order and flattens their prompt and tool
 * contributions into the exact catalog consumed by the PI Mono runtime bootstrap.
 */
export class AgentSessionModuleRegistry {
  private readonly modules: AgentSessionModuleInterface[];

  constructor(modules: AgentSessionModuleInterface[]) {
    this.modules = modules;
  }

  /**
   * Resolves the active module set once for a bootstrap context so tool providers and prompt layers
   * are assembled from the same activation decisions and preserve the declared module order.
   */
  async resolve(
    context: AgentSessionBootstrapContext,
  ): Promise<AgentSessionModuleRegistryResolution> {
    const appendSystemPrompts: string[] = [];
    const toolProviders: AgentToolProviderInterface[] = [];

    for (const sessionModule of this.modules) {
      if (!await sessionModule.shouldApply(context)) {
        continue;
      }

      appendSystemPrompts.push(...(await sessionModule.createAppendSystemPrompts(context)).filter((prompt) => {
        return typeof prompt === "string" && prompt.length > 0;
      }));
      toolProviders.push(...await sessionModule.createToolProviders(context));
    }

    return {
      appendSystemPrompts,
      toolProviders,
    };
  }
}
