import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentWebResultFormatter } from "./result_formatter.ts";
import { AgentWebToolService } from "./service.ts";

/**
 * Uses Exa search for discovery across the public web and returns extracted page text so the agent
 * can decide which URLs to inspect more deeply with `web_fetch`.
 */
export class AgentWebSearchTool {
  private static readonly parameters = AgentToolParameterSchema.object({
    excludeDomains: Type.Optional(Type.Array(Type.String(), {
      description: "Optional domains to exclude from the search results.",
      maxItems: 20,
    })),
    includeDomains: Type.Optional(Type.Array(Type.String(), {
      description: "Optional domains to restrict the search to.",
      maxItems: 20,
    })),
    maxAgeHours: Type.Optional(Type.Integer({
      description:
        "Optional freshness constraint for cached Exa content. Use 0 to always fetch fresh content, -1 to use cache only.",
      minimum: -1,
    })),
    maxCharactersPerResult: Type.Optional(Type.Integer({
      description: "Optional maximum number of extracted characters to return per search result.",
      maximum: 20000,
      minimum: 200,
    })),
    numResults: Type.Optional(Type.Integer({
      description: "Optional number of search results to return.",
      maximum: 10,
      minimum: 1,
    })),
    query: Type.String({
      description: "Search query to send to Exa.",
    }),
    searchType: Type.Optional(Type.Union([
      Type.Literal("auto"),
      Type.Literal("deep"),
      Type.Literal("deep-reasoning"),
      Type.Literal("fast"),
      Type.Literal("hybrid"),
      Type.Literal("instant"),
      Type.Literal("keyword"),
      Type.Literal("neural"),
    ])),
  });

  private readonly webToolService: AgentWebToolService;

  constructor(webToolService: AgentWebToolService) {
    this.webToolService = webToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentWebSearchTool.parameters> {
    return {
      description: "Search the public web with Exa and return extracted excerpts from the top matching pages.",
      execute: async (_toolCallId, input) => {
        const response = await this.webToolService.searchWeb(input);
        return {
          content: [{
            text: AgentWebResultFormatter.formatSearchResults(input.query, response.results),
            type: "text",
          }],
          details: {
            query: input.query,
            requestId: response.requestId,
            resultCount: response.results.length,
            searchType: input.searchType ?? "auto",
          },
        };
      },
      label: "web_search",
      name: "web_search",
      parameters: AgentWebSearchTool.parameters,
      promptGuidelines: [
        "Use web_search when you need discovery across the public web before choosing which URLs to inspect.",
        "Use includeDomains or excludeDomains when you need to focus the search on specific sources.",
        "Prefer web_fetch after web_search when you need the full contents of a particular result URL.",
      ],
      promptSnippet: "Search the web with Exa",
    };
  }
}
