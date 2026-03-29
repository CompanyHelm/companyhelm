import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentEnvironmentPromptScope } from "../../environment/prompt_scope.ts";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentCloseTerminalSessionTool } from "./close_session.ts";
import { AgentExecuteCommandTool } from "./execute_command.ts";
import { AgentKillTerminalSessionTool } from "./kill_session.ts";
import { AgentListTerminalSessionsTool } from "./list_sessions.ts";
import { AgentReadTerminalOutputTool } from "./read_output.ts";
import { AgentResizeTerminalSessionTool } from "./resize_session.ts";
import { AgentSendTerminalInputTool } from "./send_input.ts";

/**
 * Groups the terminal-oriented environment tools behind one provider so the shared tool catalog
 * can compose them without knowing how many concrete terminal tools exist.
 */
export class AgentTerminalToolProvider extends AgentToolProviderInterface {
  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope) {
    super();
    this.promptScope = promptScope;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentListTerminalSessionsTool(this.promptScope).createDefinition(),
      new AgentExecuteCommandTool(this.promptScope).createDefinition(),
      new AgentSendTerminalInputTool(this.promptScope).createDefinition(),
      new AgentReadTerminalOutputTool(this.promptScope).createDefinition(),
      new AgentResizeTerminalSessionTool(this.promptScope).createDefinition(),
      new AgentKillTerminalSessionTool(this.promptScope).createDefinition(),
      new AgentCloseTerminalSessionTool(this.promptScope).createDefinition(),
    ];
  }
}
