import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";
import { WorkflowService } from "./workflows/service.ts";
import { WorkflowSystemCommandService } from "./workflows/system_command_service.ts";
import { SessionSkillService } from "./skills/session_service.ts";
import { SystemCommandCatalog } from "./skills/system_command_catalog.ts";

export type SystemCommandExecutionContext = {
  agentId: string;
  companyId: string;
  sessionId: string;
  transactionProvider: TransactionProviderInterface;
};

/**
 * Dispatches the single generic system_command tool into explicitly registered platform commands.
 * It enforces the active-system-skill boundary before invoking handlers, so command IDs alone never
 * grant access to product-owned mutation capabilities.
 */
export class SystemCommandService {
  private readonly commandCatalog: SystemCommandCatalog;
  private readonly sessionSkillService: SessionSkillService;
  private readonly workflowCommandService: WorkflowSystemCommandService;

  constructor(input: {
    commandCatalog?: SystemCommandCatalog;
    sessionSkillService?: SessionSkillService;
    workflowService: WorkflowService;
  }) {
    this.commandCatalog = input.commandCatalog ?? new SystemCommandCatalog();
    this.sessionSkillService = input.sessionSkillService ?? new SessionSkillService();
    this.workflowCommandService = new WorkflowSystemCommandService(input.workflowService);
  }

  async executeCommand(
    commandId: string,
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const command = this.commandCatalog.requireCommandDefinition(commandId);
    const isActive = await this.sessionSkillService.isSystemSkillActive(context.transactionProvider, {
      companyId: context.companyId,
      sessionId: context.sessionId,
      systemSkillKey: command.systemSkillKey,
    });
    if (!isActive) {
      throw new Error(`Activate the ${command.systemSkillKey} system skill before running ${command.id}.`);
    }

    if (command.systemSkillKey === "manage_workflows") {
      return this.workflowCommandService.execute(command.id, input, {
        companyId: context.companyId,
        transactionProvider: context.transactionProvider,
      });
    }

    throw new Error(`System command ${command.id} is not wired to a handler.`);
  }
}
