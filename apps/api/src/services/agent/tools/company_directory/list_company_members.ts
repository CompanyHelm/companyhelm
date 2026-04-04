import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { AgentToolParameterSchema } from "../parameter_schema.ts";
import { AgentCompanyDirectoryResultFormatter } from "./result_formatter.ts";
import { AgentCompanyDirectoryToolService } from "./service.ts";

/**
 * Lists the human members in the company directory so the current agent can reference real user
 * ids for assignment, ownership, or escalation decisions.
 */
export class AgentListCompanyMembersTool {
  private static readonly parameters = AgentToolParameterSchema.object({});

  private readonly companyDirectoryToolService: AgentCompanyDirectoryToolService;

  constructor(companyDirectoryToolService: AgentCompanyDirectoryToolService) {
    this.companyDirectoryToolService = companyDirectoryToolService;
  }

  createDefinition(): ToolDefinition<typeof AgentListCompanyMembersTool.parameters> {
    return {
      description: "List the human company members with their ids and names.",
      execute: async () => {
        const members = await this.companyDirectoryToolService.listCompanyMembers();
        return {
          content: [{
            text: AgentCompanyDirectoryResultFormatter.formatMembers(members),
            type: "text",
          }],
        };
      },
      label: "list_company_members",
      name: "list_company_members",
      parameters: AgentListCompanyMembersTool.parameters,
      promptGuidelines: [
        "Use list_company_members when you need a human company member id for assignment or escalation.",
      ],
      promptSnippet: "List human company members",
    };
  }
}
