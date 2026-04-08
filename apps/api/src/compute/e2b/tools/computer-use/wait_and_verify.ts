import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../../../../services/agent/tools/parameter_schema.ts";
import { AgentComputeE2bComputerUseResultFormatter } from "./result_formatter.ts";
import { AgentComputeE2bComputerUseToolService } from "./service.ts";

/**
 * Polls a sandbox command until the requested output predicate matches or the timeout expires.
 */
export class AgentComputeE2bComputerUseWaitAndVerifyTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    command: Type.String({
      description: "Shell command to poll inside the sandbox.",
    }),
    expectedExitCode: Type.Optional(Type.Number({
      description: "Optional exit code that the command result must match.",
    })),
    intervalSeconds: Type.Optional(Type.Number({
      description: "Optional polling interval in seconds.",
    })),
    stderrIncludes: Type.Optional(Type.Array(Type.String(), {
      description: "Optional substrings that must all appear in stderr.",
    })),
    stderrMatchesRegex: Type.Optional(Type.String({
      description: "Optional regular expression that stderr must match.",
    })),
    stdoutIncludes: Type.Optional(Type.Array(Type.String(), {
      description: "Optional substrings that must all appear in stdout.",
    })),
    stdoutMatchesRegex: Type.Optional(Type.String({
      description: "Optional regular expression that stdout must match.",
    })),
    timeoutSeconds: Type.Optional(Type.Number({
      description: "Optional maximum wait time in seconds.",
    })),
  });

  private readonly toolService: AgentComputeE2bComputerUseToolService;

  constructor(toolService: AgentComputeE2bComputerUseToolService) {
    this.toolService = toolService;
  }

  createDefinition(): ToolDefinition<typeof AgentComputeE2bComputerUseWaitAndVerifyTool.parameters> {
    return {
      description: "Poll a sandbox command until its output matches the requested condition or the timeout expires.",
      execute: async (_toolCallId, params) => {
        const matched = await this.toolService.waitAndVerify(params);
        return {
          content: [{
            text: AgentComputeE2bComputerUseResultFormatter.formatWaitAndVerify(matched, params.command),
            type: "text",
          }],
          details: {
            command: params.command,
            matched,
            type: "computer_use_wait_and_verify",
          },
        };
      },
      label: "computer_wait_and_verify",
      name: "computer_wait_and_verify",
      parameters: AgentComputeE2bComputerUseWaitAndVerifyTool.parameters,
      promptGuidelines: [
        "Use stdoutIncludes, stderrIncludes, or regex predicates when you need a specific command output to appear.",
        "If no predicate fields are provided, the command is considered successful when it exits with code 0.",
      ],
      promptSnippet: "Wait for a sandbox condition to become true",
    };
  }
}
