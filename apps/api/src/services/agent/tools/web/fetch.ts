import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentWebResultFormatter } from "./result_formatter.ts";
import { AgentWebToolService } from "./service.ts";

/**
 * Loads one or more known URLs through Exa contents retrieval so the agent can read cleaned page
 * bodies without relying on direct environment-side HTTP fetching.
 */
export class AgentWebFetchTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    format: Type.Optional(Type.Union([
      Type.Literal("markdown"),
      Type.Literal("html"),
    ])),
    maxAgeHours: Type.Optional(Type.Integer({
      description:
        "Optional freshness constraint for cached Exa content. Use 0 to always fetch fresh content, -1 to use cache only.",
      minimum: -1,
    })),
    maxCharactersPerPage: Type.Optional(Type.Integer({
      description: "Optional maximum number of extracted characters to return per page.",
      maximum: 40000,
      minimum: 200,
    })),
    urls: Type.Array(Type.String({
      description: "One or more absolute HTTP or HTTPS URLs to retrieve through Exa.",
    }), {
      maxItems: 10,
      minItems: 1,
    }),
  });

  private readonly webToolService: AgentWebToolService;

  constructor(webToolService: AgentWebToolService) {
    this.webToolService = webToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentWebFetchTool.parameters> {
    return {
      description: "Fetch one or more web pages through Exa contents retrieval. Prefer markdown unless exact HTML tags are necessary.",
      execute: async (_toolCallId, input) => {
        const format = input.format ?? "markdown";
        const response = await this.webToolService.fetchPages({
          format,
          maxAgeHours: input.maxAgeHours,
          maxCharactersPerPage: input.maxCharactersPerPage,
          urls: input.urls,
        });

        return {
          content: [{
            text: AgentWebResultFormatter.formatFetchPages(response.pages, format),
            type: "text",
          }],
          details: {
            format,
            pageCount: response.pages.length,
            requestId: response.requestId,
            urls: input.urls,
          },
        };
      },
      label: "web_fetch",
      name: "web_fetch",
      parameters: AgentWebFetchTool.parameters,
      promptGuidelines: [
        "Use web_fetch when you already know the URL or URLs you want to inspect.",
        "Prefer format=markdown unless you specifically need HTML tags or lightweight markup structure.",
        "Use multiple URLs only when reading them together is materially useful for the same task.",
      ],
      promptSnippet: "Fetch one or more web pages through Exa",
    };
  }
}
