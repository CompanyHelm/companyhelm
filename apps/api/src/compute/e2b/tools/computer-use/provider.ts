import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolProviderInterface } from "../../../../services/agent/tools/provider_interface.ts";
import { AgentComputeE2bComputerUseClickTool } from "./click.ts";
import { AgentComputeE2bComputerUseDragTool } from "./drag.ts";
import { AgentComputeE2bComputerUseLaunchTool } from "./launch.ts";
import { AgentComputeE2bComputerUseMouseButtonTool } from "./mouse_button.ts";
import { AgentComputeE2bComputerUseMoveMouseTool } from "./move_mouse.ts";
import { AgentComputeE2bComputerUseOpenTool } from "./open.ts";
import { AgentComputeE2bComputerUsePressTool } from "./press.ts";
import { AgentComputeE2bComputerUseScreenshotTool } from "./screenshot.ts";
import { AgentComputeE2bComputerUseScreenStateTool } from "./screen_state.ts";
import { AgentComputeE2bComputerUseScrollTool } from "./scroll.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";
import { AgentComputeE2bComputerUseWaitTool } from "./wait.ts";
import { AgentComputeE2bComputerUseWaitAndVerifyTool } from "./wait_and_verify.ts";
import { AgentComputeE2bComputerUseWindowTool } from "./window.ts";
import { AgentComputeE2bComputerUseWriteTool } from "./write.ts";

/**
 * Groups the desktop SDK-backed computer-use tools so E2B templates can inject the full catalog
 * only for sessions whose selected environment supports desktop interaction.
 */
export class AgentComputeE2bComputerUseToolProvider extends AgentToolProviderInterface {
  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(toolService: AgentComputeE2bComputerUseToolService) {
    super();
    this.toolService = toolService;
  }

  createToolDefinitions(): ToolDefinition[] {
    const definitions = [
      new AgentComputeE2bComputerUseScreenshotTool(this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseScreenStateTool("screenSize", this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseScreenStateTool("cursorPosition", this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseMoveMouseTool(this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseClickTool("left", this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseClickTool("double", this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseClickTool("right", this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseClickTool("middle", this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseMouseButtonTool("press", this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseMouseButtonTool("release", this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseDragTool(this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseScrollTool(this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseWriteTool(this.toolService).createDefinition(),
      new AgentComputeE2bComputerUsePressTool(this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseWaitTool(this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseWaitAndVerifyTool(this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseOpenTool(this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseLaunchTool(this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseWindowTool("currentWindowId", this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseWindowTool("applicationWindows", this.toolService).createDefinition(),
      new AgentComputeE2bComputerUseWindowTool("windowTitle", this.toolService).createDefinition(),
    ];

    return definitions as ToolDefinition[];
  }
}
