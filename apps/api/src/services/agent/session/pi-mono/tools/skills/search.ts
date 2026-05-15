import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentSkillResultFormatter } from "./result_formatter.ts";
import { AgentSkillToolService } from "./service.ts";

/**
 * Searches the agent-visible skill catalog so the model can discover the exact skill name to
 * activate without scanning the full prompt catalog line by line.
 */
export class AgentSearchSkillsTool {
  private static readonly defaultLimit = 5;
  private static readonly parameters = AgentToolParameterSchema.object({
    limit: Type.Optional(Type.Integer({
      default: AgentSearchSkillsTool.defaultLimit,
      description: "Maximum number of skill matches to return.",
      minimum: 1,
      maximum: 10,
    })),
    query: Type.String({
      description: "Search text used to find relevant skills by name or description.",
      minLength: 1,
    }),
  });

  private readonly skillToolService: AgentSkillToolService;

  constructor(skillToolService: AgentSkillToolService) {
    this.skillToolService = skillToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentSearchSkillsTool.parameters> {
    return {
      description: "Search the current skill catalog by name and description to find exact skill names before activation.",
      execute: async (_toolCallId, params, signal, onUpdate, ctx) => {
        void signal;
        void onUpdate;
        void ctx;
        const matches = await this.skillToolService.searchSkills(
          params.query,
          params.limit ?? AgentSearchSkillsTool.defaultLimit,
        );
        return {
          content: [{
            text: AgentSkillResultFormatter.formatSkillSearchResults(params.query, matches),
            type: "text",
          }],
          details: {
            matchCount: matches.length,
            query: params.query,
            skillNames: matches.map((skill) => skill.name),
          },
        };
      },
      label: "search_skills",
      name: "search_skills",
      parameters: AgentSearchSkillsTool.parameters,
      promptGuidelines: [
        "Use search_skills when you know the capability you need but not the exact skill name.",
        "After search_skills returns a match, call activate_skill with the exact skill name you selected.",
      ],
      promptSnippet: "Search the skill catalog",
    } as ToolDefinition<typeof AgentSearchSkillsTool.parameters>;
  }
}
