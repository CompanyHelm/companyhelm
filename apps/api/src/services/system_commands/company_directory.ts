import type { SystemCommandExecutionContext } from "../system_command_service.ts";
import { AgentCompanyDirectoryToolService } from "../agent/session/pi-mono/tools/company_directory/service.ts";
import { SystemCommandJsonSerializer } from "./json_serializer.ts";

/**
 * Exposes read-only company directory commands once the directory system skill is active. The
 * command surface intentionally stays small because these records are used mainly as ids for later
 * agent or human collaboration calls.
 */
export class CompanyDirectorySystemCommandService {
  private readonly jsonSerializer = new SystemCommandJsonSerializer();

  async execute(
    commandId: string,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const service = new AgentCompanyDirectoryToolService(
      context.transactionProvider,
      context.companyId,
    );

    switch (commandId) {
      case "company_directory.agents.list":
        return this.jsonSerializer.serializeRecord({ agents: await service.listCompanyAgents() });
      case "company_directory.members.list":
        return this.jsonSerializer.serializeRecord({ members: await service.listCompanyMembers() });
      default:
        throw new Error(`System command ${commandId} is not handled by company directory.`);
    }
  }
}
