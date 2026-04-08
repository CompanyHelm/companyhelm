import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentArtifactResultFormatter } from "./result_formatter.ts";
import { AgentArtifactToolService } from "./service.ts";

/**
 * Replaces the URL payload for one external-link artifact while preserving the artifact identity
 * and shared metadata.
 */
export class AgentUpdateExternalLinkArtifactTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    artifactId: Type.String({
      description: "The external-link artifact id to update.",
    }),
    url: Type.String({
      description: "The replacement absolute URL.",
    }),
  });

  private readonly artifactToolService: AgentArtifactToolService;

  constructor(artifactToolService: AgentArtifactToolService) {
    this.artifactToolService = artifactToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentUpdateExternalLinkArtifactTool.parameters> {
    return {
      description: "Replace the URL for one external-link artifact.",
      execute: async (_toolCallId, params) => {
        const artifact = await this.artifactToolService.updateExternalLinkArtifact({
          artifactId: params.artifactId,
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
      label: "update_external_link_artifact",
      name: "update_external_link_artifact",
      parameters: AgentUpdateExternalLinkArtifactTool.parameters,
      promptGuidelines: [
        "Use update_external_link_artifact when an external-link artifact points at the wrong URL.",
      ],
      promptSnippet: "Update an external-link artifact",
    };
  }
}
