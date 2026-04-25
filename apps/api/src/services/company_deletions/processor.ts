import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { AdminDatabase } from "../../db/admin_database.ts";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../../db/app_runtime_transaction_provider.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import { AgentComputeProviderRegistry } from "../environments/providers/provider_registry.ts";
import type { AgentEnvironmentRecord } from "../environments/providers/provider_interface.ts";
import { WorkflowSchedulerSyncService } from "../workflows/scheduler_sync.ts";
import { ClerkOrganizationDeletionService } from "./clerk_organization_deletion.ts";
import { CompanyDeletionRequestService } from "./request_service.ts";

type TriggerIdRow = {
  id: string;
};

/**
 * Executes one company deletion request from its durable row through every side effect that cannot
 * be handled by database cascades: scheduled BullMQ wakeups, provider-backed environments, Clerk
 * organization removal, and finally the local company row.
 */
@injectable()
export class CompanyDeletionProcessor {
  private readonly adminDatabase: AdminDatabase;
  private readonly appRuntimeDatabase: AppRuntimeDatabase;
  private readonly clerkOrganizationDeletionService: ClerkOrganizationDeletionService;
  private readonly logger: PinoLogger;
  private readonly providerRegistry: AgentComputeProviderRegistry;
  private readonly requestService: CompanyDeletionRequestService;
  private readonly workflowSchedulerSyncService: WorkflowSchedulerSyncService;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(AppRuntimeDatabase) appRuntimeDatabase: AppRuntimeDatabase,
    @inject(CompanyDeletionRequestService) requestService: CompanyDeletionRequestService,
    @inject(ClerkOrganizationDeletionService)
    clerkOrganizationDeletionService: ClerkOrganizationDeletionService,
    @inject(AgentComputeProviderRegistry) providerRegistry: AgentComputeProviderRegistry,
    @inject(WorkflowSchedulerSyncService) workflowSchedulerSyncService: WorkflowSchedulerSyncService,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    this.adminDatabase = adminDatabase;
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.clerkOrganizationDeletionService = clerkOrganizationDeletionService;
    this.logger = logger.child({
      component: "company_deletion_processor",
    });
    this.providerRegistry = providerRegistry;
    this.requestService = requestService;
    this.workflowSchedulerSyncService = workflowSchedulerSyncService;
  }

  async process(input: {
    requestId: string;
    workerId: string;
  }): Promise<void> {
    const request = await this.requestService.claimRequest(this.adminDatabase, input);
    if (!request) {
      return;
    }

    try {
      await this.removeWorkflowSchedules(request.companyId);
      await this.deleteProviderEnvironments(request.companyId);
      await this.clerkOrganizationDeletionService.deleteOrganization(request.clerkOrganizationId);
      await this.requestService.deleteCompany(this.adminDatabase, request.companyId);
      await this.requestService.markCompleted(this.adminDatabase, request.id);
      this.logger.info({
        companyId: request.companyId,
        requestId: request.id,
      }, "completed company deletion request");
    } catch (error) {
      await this.requestService.markFailed(this.adminDatabase, {
        error,
        requestId: request.id,
      });
      this.logger.error({
        companyId: request.companyId,
        error,
        requestId: request.id,
      }, "company deletion request failed");
      throw error;
    }
  }

  private async removeWorkflowSchedules(companyId: string): Promise<void> {
    const sql = this.adminDatabase.getSqlClient();
    const triggerRows = await sql<TriggerIdRow[]>`
      SELECT id
      FROM workflow_triggers
      WHERE company_id = ${companyId}
    `;
    for (const triggerRow of triggerRows) {
      await this.workflowSchedulerSyncService.removeCronTrigger(triggerRow.id);
    }
  }

  private async deleteProviderEnvironments(companyId: string): Promise<void> {
    const sql = this.adminDatabase.getSqlClient();
    const environments = await sql<AgentEnvironmentRecord[]>`
      SELECT
        id,
        company_id AS "companyId",
        agent_id AS "agentId",
        provider,
        provider_definition_id AS "providerDefinitionId",
        provider_environment_id AS "providerEnvironmentId",
        template_id AS "templateId",
        display_name AS "displayName",
        platform,
        cpu_count AS "cpuCount",
        memory_gb AS "memoryGb",
        disk_space_gb AS "diskSpaceGb",
        metadata,
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        last_seen_at AS "lastSeenAt"
      FROM agent_environments
      WHERE company_id = ${companyId}
    `;
    if (environments.length === 0) {
      return;
    }

    const transactionProvider = new AppRuntimeTransactionProvider(this.appRuntimeDatabase, companyId);
    for (const environment of environments) {
      await this.providerRegistry
        .get(environment.provider)
        .deleteEnvironment(transactionProvider, environment);
    }
  }
}
