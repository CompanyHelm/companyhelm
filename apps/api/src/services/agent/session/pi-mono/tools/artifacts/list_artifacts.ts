import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentArtifactResultFormatter } from "./result_formatter.ts";
import { AgentArtifactToolService } from "./service.ts";

/**
 * Lists artifacts for one company or task scope so the agent can discover existing docs, links,
 * and pull requests before creating duplicates or editing the wrong record.
 */
export class AgentListArtifactsTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    scopeType: Type.Union([
      Type.Literal("company"),
      Type.Literal("task"),
      Type.Literal("session"),
    ], {
      description: "Which scope to inspect. Use session for artifacts belonging only to the current live session.",
    }),
    taskId: Type.Optional(Type.String({
      description: "Required when scopeType is task. Omit when scopeType is company or session.",
    })),
  });

  private readonly artifactToolService: AgentArtifactToolService;

  constructor(artifactToolService: AgentArtifactToolService) {
    this.artifactToolService = artifactToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentListArtifactsTool.parameters> {
    return {
      description: "List the artifacts stored for the current company, one task, or this session.",
      execute: async (_toolCallId, params) => {
        const artifacts = await this.artifactToolService.listArtifacts({
          scopeType: params.scopeType,
          taskId: params.taskId,
        });

        return {
          content: [{
            text: AgentArtifactResultFormatter.formatArtifactList(artifacts),
            type: "text",
          }],
          details: {
            artifactCount: artifacts.length,
            scopeType: params.scopeType,
            taskId: params.taskId ?? null,
            type: "artifact_list",
          },
        };
      },
      label: "list_artifacts",
      name: "list_artifacts",
      parameters: AgentListArtifactsTool.parameters,
      promptGuidelines: [
        "Use list_artifacts before creating a new artifact when you need to check whether one already exists.",
        "Pass scopeType=task together with taskId to inspect the artifacts attached to one task.",
        "Pass scopeType=session to inspect artifacts attached only to the current live session.",
      ],
      promptSnippet: "List artifacts for a company, task, or session scope",
    };
  }
}
