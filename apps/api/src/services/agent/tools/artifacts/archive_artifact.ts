import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentArtifactResultFormatter } from "./result_formatter.ts";
import { AgentArtifactToolService } from "./service.ts";

/**
 * Archives one artifact so the agent can hide stale deliverables without deleting the underlying
 * record or breaking existing references.
 */
export class AgentArchiveArtifactTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    artifactId: Type.String({
      description: "The artifact id to archive.",
    }),
  });

  private readonly artifactToolService: AgentArtifactToolService;

  constructor(artifactToolService: AgentArtifactToolService) {
    this.artifactToolService = artifactToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentArchiveArtifactTool.parameters> {
    return {
      description: "Archive one artifact without deleting it.",
      execute: async (_toolCallId, params) => {
        const artifact = await this.artifactToolService.archiveArtifact(params.artifactId);

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
      label: "archive_artifact",
      name: "archive_artifact",
      parameters: AgentArchiveArtifactTool.parameters,
      promptGuidelines: [
        "Use archive_artifact when an artifact should stay in history but no longer appear as active work.",
      ],
      promptSnippet: "Archive an artifact",
    };
  }
}
