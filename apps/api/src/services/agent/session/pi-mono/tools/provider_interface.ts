import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

/**
 * Supplies one coherent slice of the PI Mono tool catalog. This keeps tool grouping and ownership
 * explicit so the top-level tool service only has to aggregate providers instead of knowing the
 * details of every individual tool implementation.
 */
export abstract class AgentToolProviderInterface {
  /**
   * Builds the tool definitions contributed by this provider for the current prompt run.
   */
  abstract createToolDefinitions(): ToolDefinition[];
}
