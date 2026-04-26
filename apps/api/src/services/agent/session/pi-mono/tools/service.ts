import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { AgentEnvironmentPromptScope } from "../../../../environments/prompt_scope.ts";
import { AgentToolProviderInterface } from "./provider_interface.ts";

type TextLikeToolContent = {
  text?: string;
  type: string;
};

type ToolResultWithContent<TContent extends TextLikeToolContent = TextLikeToolContent> = {
  content: TContent[];
};

/**
 * Aggregates tool providers for one prompt run. Concrete tool providers own the actual tool
 * definitions, while this service only caches the combined catalog and coordinates prompt-scope
 * cleanup after the PI Mono run ends.
 */
export class AgentToolsService {
  private static readonly maxToolOutputChars = 1_000_000;

  private readonly promptScope: AgentEnvironmentPromptScope;
  private readonly toolProviders: AgentToolProviderInterface[];
  private initializedTools: ToolDefinition[] | null = null;

  constructor(
    promptScope: AgentEnvironmentPromptScope,
    toolProviders: AgentToolProviderInterface[],
  ) {
    this.promptScope = promptScope;
    this.toolProviders = toolProviders;
  }

  initializeTools(): ToolDefinition[] {
    if (this.initializedTools) {
      return this.initializedTools;
    }

    this.initializedTools = this.toolProviders.flatMap((toolProvider) => {
      return toolProvider.createToolDefinitions();
    }).map((toolDefinition) => {
      return this.wrapToolDefinition(toolDefinition as ToolDefinition);
    }) as ToolDefinition[];

    return this.initializedTools;
  }

  async cleanupTools(): Promise<void> {
    await this.promptScope.dispose();
    this.initializedTools = null;
  }

  private wrapToolDefinition(toolDefinition: ToolDefinition): ToolDefinition {
    const execute = toolDefinition.execute.bind(toolDefinition);

    return {
      ...toolDefinition,
      execute: (async (toolCallId, params, signal, onUpdate, ctx) => {
        const truncatedOnUpdate = onUpdate
          ? (partialResult: AgentToolResult<unknown>) => {
            onUpdate(this.truncateToolResult(partialResult));
          }
          : undefined;
        const result = await execute(
          toolCallId,
          params,
          signal,
          truncatedOnUpdate,
          ctx,
        );

        return this.truncateToolResult(result);
      }) as ToolDefinition["execute"],
    };
  }

  private truncateToolResult<TResult extends ToolResultWithContent>(result: TResult): TResult {
    return {
      ...result,
      content: result.content.map((content) => {
        if (content.type !== "text" || typeof content.text !== "string") {
          return content;
        }

        return {
          ...content,
          text: AgentToolsService.truncateText(content.text),
        };
      }),
    };
  }

  private static truncateText(text: string): string {
    if (text.length <= AgentToolsService.maxToolOutputChars) {
      return text;
    }

    const marker = `[Tool output truncated: original length ${text.length} characters; maximum is ${AgentToolsService.maxToolOutputChars} characters.]\n\n`;
    const remainingOutputChars = AgentToolsService.maxToolOutputChars - marker.length;
    return `${marker}${text.slice(0, remainingOutputChars)}`;
  }
}
