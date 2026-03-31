import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentArtifactResultFormatter } from "./result_formatter.ts";
import { AgentArtifactToolService } from "./service.ts";

/**
 * Persists one markdown artifact such as a PRD or design doc so the agent can leave durable
 * deliverables attached to a company or task scope.
 */
export class AgentCreateMarkdownArtifactTool {
  private static readonly parameters = Type.Object({
    contentMarkdown: Type.String({
      description: "The markdown document body to persist.",
    }),
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
  });

  private readonly artifactToolService: AgentArtifactToolService;

  constructor(artifactToolService: AgentArtifactToolService) {
    this.artifactToolService = artifactToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentCreateMarkdownArtifactTool.parameters> {
    return {
      description: "Create a markdown artifact for a company or task.",
      execute: async (_toolCallId, params) => {
        const artifact = await this.artifactToolService.createMarkdownArtifact({
          contentMarkdown: params.contentMarkdown,
          description: params.description,
          name: params.name,
          scopeType: params.scopeType,
          state: params.state,
          taskId: params.taskId,
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
      label: "create_markdown_artifact",
      name: "create_markdown_artifact",
      parameters: AgentCreateMarkdownArtifactTool.parameters,
      promptGuidelines: [
        "Use create_markdown_artifact for PRDs, design docs, notes, and any artifact whose main payload is markdown.",
      ],
      promptSnippet: "Create a markdown artifact",
    };
  }
}
