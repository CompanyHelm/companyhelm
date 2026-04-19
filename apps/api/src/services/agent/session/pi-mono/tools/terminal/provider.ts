import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { Logger as PinoLogger } from "pino";
import { AgentEnvironmentPromptScope } from "../../../../../environments/prompt_scope.ts";
import { AgentToolProviderInterface } from "../provider_interface.ts";
import { AgentApplyPatchTool } from "./apply_patch.ts";
import { AgentBashExecTool } from "./bash_exec.ts";
import { AgentE2bPortUrlTool } from "./e2b_port_url.ts";
import { AgentPtyExecTool } from "./pty_exec.ts";
import { AgentPtyKillTool } from "./pty_kill.ts";
import { AgentPtyListTool } from "./pty_list.ts";
import { AgentPtyReadOutputTool } from "./pty_read_output.ts";
import { AgentPtyResizeTool } from "./pty_resize.ts";
import { AgentPtySendInputTool } from "./pty_send_input.ts";
import { AgentReadImageTool } from "./read_image.ts";
import { AgentReadImageToolService } from "./read_image_service.ts";

/**
 * Groups the environment-backed shell editing and terminal tools behind one provider so the
 * shared tool catalog can compose them without knowing how many concrete environment tools exist.
 */
export class AgentTerminalToolProvider extends AgentToolProviderInterface {
  private readonly logger: PinoLogger;
  private readonly promptScope: AgentEnvironmentPromptScope;
  private readonly readImageToolService: AgentReadImageToolService;

  constructor(
    promptScope: AgentEnvironmentPromptScope,
    logger: PinoLogger,
    readImageToolService: AgentReadImageToolService,
  ) {
    super();
    this.promptScope = promptScope;
    this.logger = logger;
    this.readImageToolService = readImageToolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    return [
      new AgentPtyListTool(this.promptScope).createDefinition(),
      new AgentPtyExecTool(this.promptScope, this.logger).createDefinition(),
      new AgentBashExecTool(this.promptScope, this.logger).createDefinition(),
      new AgentApplyPatchTool(this.promptScope).createDefinition(),
      new AgentPtySendInputTool(this.promptScope).createDefinition(),
      new AgentPtyReadOutputTool(this.promptScope).createDefinition(),
      new AgentPtyResizeTool(this.promptScope).createDefinition(),
      new AgentPtyKillTool(this.promptScope).createDefinition(),
      new AgentReadImageTool(this.promptScope, this.readImageToolService).createDefinition(),
      new AgentE2bPortUrlTool(this.promptScope).createDefinition(),
    ];
  }
}
