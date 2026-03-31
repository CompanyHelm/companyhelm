import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentArtifactResultFormatter } from "./result_formatter.ts";
import { AgentArtifactToolService } from "./service.ts";

/**
 * Loads one artifact including its type-specific content so the agent can inspect markdown,
 * follow links, or reason about a pull-request attachment without querying every subtype table.
 */
export class AgentGetArtifactTool {
  private static readonly parameters = Type.Object({
    artifactId: Type.String({
      description: "The artifact id to load.",
    }),
  });

  private readonly artifactToolService: AgentArtifactToolService;

  constructor(artifactToolService: AgentArtifactToolService) {
    this.artifactToolService = artifactToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentGetArtifactTool.parameters> {
    return {
      description: "Load one artifact and return its metadata plus markdown or URL payload.",
      execute: async (_toolCallId, params) => {
        const artifact = await this.artifactToolService.getArtifact(params.artifactId);

        return {
          content: [{
            text: AgentArtifactResultFormatter.formatArtifact(artifact),
            type: "text",
          }],
          details: {
            artifactId: artifact.id,
            scopeType: artifact.scopeType,
            type: "artifact",
          },
        };
      },
      label: "get_artifact",
      name: "get_artifact",
      parameters: AgentGetArtifactTool.parameters,
      promptGuidelines: [
        "Use get_artifact when you need the full markdown content or URL payload for one specific artifact.",
      ],
      promptSnippet: "Read one artifact and its content",
    };
  }
}
