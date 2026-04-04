import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentArtifactResultFormatter } from "./result_formatter.ts";
import { AgentArtifactToolService } from "./service.ts";

/**
 * Persists one external-link artifact so the agent can attach URLs with durable names and
 * descriptions instead of only mentioning them in transcript text.
 */
export class AgentCreateExternalLinkArtifactTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    description: Type.Optional(Type.String({
      description: "Optional short description shown in artifact lists.",
    })),
    name: Type.String({
      description: "Human-readable artifact name.",
    }),
    scopeType: Type.Union([
      Type.Literal("company"),
      Type.Literal("task"),
    ]),
    state: Type.Optional(Type.Union([
      Type.Literal("draft"),
      Type.Literal("active"),
      Type.Literal("archived"),
    ])),
    taskId: Type.Optional(Type.String({
      description: "Required when scopeType is task.",
    })),
    url: Type.String({
      description: "The absolute URL to persist.",
    }),
  });

  private readonly artifactToolService: AgentArtifactToolService;

  constructor(artifactToolService: AgentArtifactToolService) {
    this.artifactToolService = artifactToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentCreateExternalLinkArtifactTool.parameters> {
    return {
      description: "Create an external-link artifact for a company or task.",
      execute: async (_toolCallId, params) => {
        const artifact = await this.artifactToolService.createExternalLinkArtifact({
          description: params.description,
          name: params.name,
          scopeType: params.scopeType,
          state: params.state,
          taskId: params.taskId,
          url: params.url,
        });

        return {
          content: [{
            text: AgentArtifactResultFormatter.formatArtifact(artifact),
            type: "text",
          }],
          details: {
            artifactId: artifact.id,
            type: "artifact",
          },
        };
      },
      label: "create_external_link_artifact",
      name: "create_external_link_artifact",
      parameters: AgentCreateExternalLinkArtifactTool.parameters,
      promptGuidelines: [
        "Use create_external_link_artifact when you want to preserve a URL with a durable name and description.",
      ],
      promptSnippet: "Create an external-link artifact",
    };
  }
}
