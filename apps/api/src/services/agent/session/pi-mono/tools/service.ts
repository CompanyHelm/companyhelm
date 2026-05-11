import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import { SessionPipelineLogger } from "../../../../../log/session_pipeline_logger.ts";
import { AgentEnvironmentPromptScope } from "../../../../environments/prompt_scope.ts";
import { AgentToolProviderInterface } from "./provider_interface.ts";

type TextLikeToolContent = {
  text?: string;
  type: string;
};

type ToolResultWithContent<
  TContent extends TextLikeToolContent = TextLikeToolContent,
> = {
  content: TContent[];
};

/**
 * Aggregates tool providers for one prompt run. Concrete tool providers own the actual tool
 * definitions, while this service only caches the combined catalog and coordinates prompt-scope
 * cleanup after the PI Mono run ends.
 */
export class AgentToolsService {
  private static readonly maxToolOutputChars = 1_000_000;
  // Every tool execution gets a hard ceiling so the session pipeline can always reconcile state.
  private static readonly hardTimeoutMilliseconds = 10 * 60 * 1_000;

  private readonly logger: SessionPipelineLogger | null;
  private readonly promptScope: AgentEnvironmentPromptScope;
  private readonly toolProviders: AgentToolProviderInterface[];
  private initializedTools: ToolDefinition[] | null = null;

  constructor(
    promptScope: AgentEnvironmentPromptScope,
    toolProviders: AgentToolProviderInterface[],
    logger: SessionPipelineLogger | null = null,
  ) {
    this.logger = logger;
    this.promptScope = promptScope;
    this.toolProviders = toolProviders;
  }

  initializeTools(): ToolDefinition[] {
    if (this.initializedTools) {
      return this.initializedTools;
    }

    this.initializedTools = this.toolProviders
      .flatMap((toolProvider) => {
        return toolProvider.createToolDefinitions();
      })
      .map((toolDefinition) => {
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
        const toolLogger =
          this.logger?.child({
            event: "agent_tool_execution",
            tool_name: toolDefinition.name,
          }) ?? null;
        const truncatedOnUpdate = onUpdate
          ? (partialResult: AgentToolResult<unknown>) => {
              onUpdate(this.truncateToolResult(partialResult));
            }
          : undefined;
        const timeoutController = new AbortController();
        const mergedSignal = this.mergeAbortSignals(
          signal,
          timeoutController.signal,
        );
        const startedAtMilliseconds = Date.now();
        let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
        try {
          // Race the actual tool body against the global hard timeout. If the timeout wins we abort
          // the merged signal, log the failure, and let the caller reconcile the persisted tool row.
          const timeoutPromise = new Promise<never>((_resolve, reject) => {
            timeoutHandle = setTimeout(() => {
              const durationMs = Date.now() - startedAtMilliseconds;
              toolLogger?.error({
                durationMs,
                event: "agent_tool_execution_hard_timeout",
                hardTimeoutMs: AgentToolsService.hardTimeoutMilliseconds,
                logMessage: "tool execution exceeded hard timeout",
                toolCallId,
              });
              const timeoutError = new Error(
                `Tool execution timed out after ${AgentToolsService.hardTimeoutMilliseconds / 1000} seconds.`,
              );
              timeoutError.name = "AgentToolExecutionTimeoutError";
              reject(timeoutError);
              timeoutController.abort();
            }, AgentToolsService.hardTimeoutMilliseconds);
          });
          const result = await Promise.race([
            execute(toolCallId, params, mergedSignal, truncatedOnUpdate, ctx),
            timeoutPromise,
          ]);

          return this.truncateToolResult(result);
        } finally {
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
        }
      }) as ToolDefinition["execute"],
    };
  }

  private mergeAbortSignals(
    primarySignal: AbortSignal | undefined,
    secondarySignal: AbortSignal,
  ): AbortSignal | undefined {
    if (!primarySignal) {
      return secondarySignal;
    }
    if (primarySignal.aborted) {
      return primarySignal;
    }
    if (secondarySignal.aborted) {
      return secondarySignal;
    }

    const mergedController = new AbortController();
    const abortMergedSignal = () => {
      if (!mergedController.signal.aborted) {
        mergedController.abort();
      }
      primarySignal.removeEventListener("abort", abortMergedSignal);
      secondarySignal.removeEventListener("abort", abortMergedSignal);
    };
    primarySignal.addEventListener("abort", abortMergedSignal);
    secondarySignal.addEventListener("abort", abortMergedSignal);
    return mergedController.signal;
  }

  private truncateToolResult<TResult extends ToolResultWithContent>(
    result: TResult,
  ): TResult {
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
    const remainingOutputChars =
      AgentToolsService.maxToolOutputChars - marker.length;
    return `${marker}${text.slice(0, remainingOutputChars)}`;
  }
}
