import type { AgentToolProviderInterface } from "../../../tools/provider_interface.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";

/**
 * Defines one capability slice that can contribute prompt fragments and tools to a PI Mono session.
 * Modules keep session assembly declarative so the session manager can activate behavior by
 * composing modules instead of manually constructing every tool and prompt layer itself.
 */
export abstract class AgentSessionModuleInterface {
  /**
   * Returns a stable identifier for diagnostics and future observability around session assembly.
   */
  abstract getName(): string;

  /**
   * Decides whether this module should participate for the current bootstrap context. Most modules
   * are always active, while provider- or template-specific modules can opt in at runtime.
   */
  async shouldApply(context: AgentSessionBootstrapContext): Promise<boolean> {
    void context;
    return true;
  }

  /**
   * Returns append-system-prompt fragments owned by this module. The registry preserves module
   * order, so modules can contribute layered instructions without centralizing prompt text.
   */
  async createAppendSystemPrompts(context: AgentSessionBootstrapContext): Promise<string[]> {
    void context;
    return [];
  }

  /**
   * Builds the tool providers this module owns for the current session. Providers stay grouped by
   * capability slice so the final tool catalog is assembled from coherent chunks.
   */
  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    void context;
    return [];
  }
}
