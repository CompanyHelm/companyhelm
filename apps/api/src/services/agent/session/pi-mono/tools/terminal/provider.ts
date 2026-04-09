import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { Logger as PinoLogger } from "pino";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentApplyPatchTool } from "./apply_patch.ts";
import { AgentBashExecTool } from "./bash_exec.ts";
import { AgentPtyExecTool } from "./pty_exec.ts";
import { AgentPtyKillTool } from "./pty_kill.ts";
import { AgentPtyListSessionsTool } from "./pty_list_sessions.ts";
import { AgentPtyReadOutputTool } from "./pty_read_output.ts";
import { AgentPtyResizeTool } from "./pty_resize.ts";
import { AgentPtySendInputTool } from "./pty_send_input.ts";

/**
 * Groups the environment-backed shell editing and terminal tools behind one provider so the
 * shared tool catalog can compose them without knowing how many concrete environment tools exist.
 */
export class AgentTerminalToolProvider extends AgentToolProviderInterface {
  private readonly logger: PinoLogger;
  private readonly promptScope: AgentEnvironmentPromptScope;

  constructor(promptScope: AgentEnvironmentPromptScope, logger: PinoLogger) {
    super();
    this.promptScope = promptScope;
    this.logger = logger;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentPtyListSessionsTool(this.promptScope).createDefinition(),
      new AgentPtyExecTool(this.promptScope, this.logger).createDefinition(),
      new AgentBashExecTool(this.promptScope, this.logger).createDefinition(),
      new AgentApplyPatchTool(this.promptScope).createDefinition(),
      new AgentPtySendInputTool(this.promptScope).createDefinition(),
      new AgentPtyReadOutputTool(this.promptScope).createDefinition(),
      new AgentPtyResizeTool(this.promptScope).createDefinition(),
      new AgentPtyKillTool(this.promptScope).createDefinition(),
    ];
  }
}
