import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../../../../services/agent/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

type WindowToolKind = "applicationWindows" | "currentWindowId" | "windowTitle";

/**
 * Exposes window discovery helpers from the E2B desktop SDK so the agent can reason about window
 * ids before targeting application-specific actions.
 */
export class AgentComputeE2bComputerUseWindowTool {
  private static readonly applicationWindowsParameters = AgentToolParameterSchema.object({
    application: Type.String({
      description: "Application name to search for, for example Chrome or Terminal.",
    }),
  });

  private static readonly currentWindowIdParameters = AgentToolParameterSchema.object({});

  private static readonly windowTitleParameters = AgentToolParameterSchema.object({
    windowId: Type.String({
      description: "Window id returned by computer_get_current_window_id or computer_get_application_windows.",
    }),
  });

  private readonly kind: WindowToolKind;
  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(kind: WindowToolKind, toolService: AgentComputeE2bComputerUseToolService) {
    this.kind = kind;
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition {
    return {
      description: this.getDescription(),
      execute: async (_toolCallId, params) => {
        switch (this.kind) {
          case "applicationWindows": {
            const input = params as { application: string };
            const windowIds = await this.toolService.getApplicationWindows(input.application);
            return {
              content: [{
                text: AgentComputeE2bComputerUseResultFormatter.formatWindowIds(input.application, windowIds),
                type: "text",
              }],
              details: {
                application: input.application,
                type: "computer_use_window_lookup",
                windowIds,
              },
            };
          }
          case "currentWindowId": {
            const windowId = await this.toolService.getCurrentWindowId();
            return {
              content: [{
                text: AgentComputeE2bComputerUseResultFormatter.formatAction(`Current window id: ${windowId}.`),
                type: "text",
              }],
              details: {
                type: "computer_use_current_window",
                windowId,
              },
            };
          }
          case "windowTitle": {
            const input = params as { windowId: string };
            const title = await this.toolService.getWindowTitle(input.windowId);
            return {
              content: [{
                text: AgentComputeE2bComputerUseResultFormatter.formatWindowTitle(input.windowId, title),
                type: "text",
              }],
              details: {
                title,
                type: "computer_use_window_title",
                windowId: input.windowId,
              },
            };
          }
        }
      },
      label: this.getToolName(),
      name: this.getToolName(),
      parameters: this.getParameters(),
      promptSnippet: this.getPromptSnippet(),
    };
  }

  private getDescription(): string {
    switch (this.kind) {
      case "applicationWindows":
        return "List the window ids for the matching desktop application.";
      case "currentWindowId":
        return "Return the currently focused desktop window id.";
      case "windowTitle":
        return "Read the title for a specific desktop window id.";
    }
  }

  private getParameters() {
    switch (this.kind) {
      case "applicationWindows":
        return AgentComputeE2bComputerUseWindowTool.applicationWindowsParameters;
      case "currentWindowId":
        return AgentComputeE2bComputerUseWindowTool.currentWindowIdParameters;
      case "windowTitle":
        return AgentComputeE2bComputerUseWindowTool.windowTitleParameters;
    }
  }

  private getPromptSnippet(): string {
    switch (this.kind) {
      case "applicationWindows":
        return "List desktop application window ids";
      case "currentWindowId":
        return "Read the focused window id";
      case "windowTitle":
        return "Read a window title";
    }
  }

  private getToolName(): string {
    switch (this.kind) {
      case "applicationWindows":
        return "computer_get_application_windows";
      case "currentWindowId":
        return "computer_get_current_window_id";
      case "windowTitle":
        return "computer_get_window_title";
    }
  }
}
