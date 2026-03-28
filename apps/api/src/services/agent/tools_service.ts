import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentEnvironmentPromptScope } from "./environment/prompt_scope.ts";
import { AgentCloseTerminalSessionTool } from "./tools/close_terminal_session.ts";
import { AgentExecuteCommandTool } from "./tools/execute_command.ts";
import { AgentKillTerminalSessionTool } from "./tools/kill_terminal_session.ts";
import { AgentListTerminalSessionsTool } from "./tools/list_terminal_sessions.ts";
import { AgentReadTerminalOutputTool } from "./tools/read_terminal_output.ts";
import { AgentResizeTerminalSessionTool } from "./tools/resize_terminal_session.ts";
import { AgentSendTerminalInputTool } from "./tools/send_terminal_input.ts";

/**
 * Builds the PI Mono tool catalog for one prompt run. The catalog itself is static, while each
 * tool lazily asks the prompt scope for a leased environment only when the tool executes.
 */
export class AgentToolsService {
  private readonly promptScope: AgentEnvironmentPromptScope;
  private initializedTools: ToolDefinition[] | null = null;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    this.promptScope = promptScope;
  }

  initializeTools(): ToolDefinition[] {
    if (this.initializedTools) {
      return this.initializedTools;
    }

    this.initializedTools = [
      new AgentListTerminalSessionsTool(this.promptScope).createDefinition(),
      new AgentExecuteCommandTool(this.promptScope).createDefinition(),
      new AgentSendTerminalInputTool(this.promptScope).createDefinition(),
      new AgentReadTerminalOutputTool(this.promptScope).createDefinition(),
      new AgentResizeTerminalSessionTool(this.promptScope).createDefinition(),
      new AgentKillTerminalSessionTool(this.promptScope).createDefinition(),
      new AgentCloseTerminalSessionTool(this.promptScope).createDefinition(),
    ];

    return this.initializedTools;
  }

  async cleanupTools(): Promise<void> {
    await this.promptScope.dispose();
    this.initializedTools = null;
  }
}
