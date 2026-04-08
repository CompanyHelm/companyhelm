import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentArtifactResultFormatter } from "./result_formatter.ts";
import { AgentArtifactToolService } from "./service.ts";

/**
 * Updates the shared artifact metadata so the agent can rename artifacts, refine descriptions, or
 * move them between draft and active states without touching the type-specific payload.
 */
export class AgentUpdateArtifactMetadataTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    artifactId: Type.String({
      description: "The artifact id to update.",
    }),
    description: Type.Optional(Type.String({
      description: "Optional replacement description.",
    })),
    name: Type.Optional(Type.String({
      description: "Optional replacement name.",
    })),
    state: Type.Optional(Type.Union([
      Type.Literal("draft"),
      Type.Literal("active"),
      Type.Literal("archived"),
    ])),
  });

  private readonly artifactToolService: AgentArtifactToolService;

  constructor(artifactToolService: AgentArtifactToolService) {
    this.artifactToolService = artifactToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentUpdateArtifactMetadataTool.parameters> {
    return {
      description: "Update an artifact's shared metadata such as name, description, or state.",
      execute: async (_toolCallId, params) => {
        const artifact = await this.artifactToolService.updateArtifactMetadata({
          artifactId: params.artifactId,
          description: params.description,
          name: params.name,
          state: params.state,
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
      label: "update_artifact_metadata",
      name: "update_artifact_metadata",
      parameters: AgentUpdateArtifactMetadataTool.parameters,
      promptGuidelines: [
        "Use update_artifact_metadata when only the shared metadata needs to change.",
      ],
      promptSnippet: "Update artifact metadata",
    };
  }
}
