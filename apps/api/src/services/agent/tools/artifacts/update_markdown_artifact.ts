import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentArtifactResultFormatter } from "./result_formatter.ts";
import { AgentArtifactToolService } from "./service.ts";

/**
 * Replaces the markdown payload for one markdown artifact while keeping the same artifact id and
 * metadata so review targets remain stable.
 */
export class AgentUpdateMarkdownArtifactTool {
  private static readonly parameters = Type.Object({
    artifactId: Type.String({
      description: "The markdown artifact id to update.",
    }),
    contentMarkdown: Type.String({
      description: "The full replacement markdown body.",
    }),
  });

  private readonly artifactToolService: AgentArtifactToolService;

  constructor(artifactToolService: AgentArtifactToolService) {
    this.artifactToolService = artifactToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentUpdateMarkdownArtifactTool.parameters> {
    return {
      description: "Replace the markdown content for one markdown artifact.",
      execute: async (_toolCallId, params) => {
        const artifact = await this.artifactToolService.updateMarkdownArtifact({
          artifactId: params.artifactId,
          contentMarkdown: params.contentMarkdown,
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
      label: "update_markdown_artifact",
      name: "update_markdown_artifact",
      parameters: AgentUpdateMarkdownArtifactTool.parameters,
      promptGuidelines: [
        "Use update_markdown_artifact when the markdown body changes but the artifact identity should stay the same.",
      ],
      promptSnippet: "Update a markdown artifact",
    };
  }
}
