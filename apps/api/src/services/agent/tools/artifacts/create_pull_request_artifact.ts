import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentArtifactResultFormatter } from "./result_formatter.ts";
import { AgentArtifactToolService } from "./service.ts";

/**
 * Persists one pull-request artifact so the agent can attach GitHub review targets to a company or
 * task scope without flattening them into generic links.
 */
export class AgentCreatePullRequestArtifactTool {
  private static readonly parameters = Type.Object({
    description: Type.Optional(Type.String({
      description: "Optional short description shown in artifact lists.",
    })),
    name: Type.String({
      description: "Human-readable artifact name.",
    }),
    provider: Type.Optional(Type.Literal("github", {
      description: "Pull request provider. Only github is supported right now.",
    })),
    pullRequestNumber: Type.Optional(Type.Integer({
      description: "Optional pull request number for the linked URL.",
    })),
    repository: Type.Optional(Type.String({
      description: "Optional owner/repo identifier for the linked pull request.",
    })),
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
      description: "The absolute pull request URL to persist.",
    }),
  });

  private readonly artifactToolService: AgentArtifactToolService;

  constructor(artifactToolService: AgentArtifactToolService) {
    this.artifactToolService = artifactToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentCreatePullRequestArtifactTool.parameters> {
    return {
      description: "Create a pull-request artifact for a company or task.",
      execute: async (_toolCallId, params) => {
        const artifact = await this.artifactToolService.createPullRequestArtifact({
          description: params.description,
          name: params.name,
          provider: params.provider,
          pullRequestNumber: params.pullRequestNumber,
          repository: params.repository,
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
      label: "create_pull_request_artifact",
      name: "create_pull_request_artifact",
      parameters: AgentCreatePullRequestArtifactTool.parameters,
      promptGuidelines: [
        "Use create_pull_request_artifact for GitHub pull requests that should stay attached to a company or task.",
      ],
      promptSnippet: "Create a pull-request artifact",
    };
  }
}
