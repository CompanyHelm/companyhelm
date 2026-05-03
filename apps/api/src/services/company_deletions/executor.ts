import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { AdminDatabase } from "../../db/admin_database.ts";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../../db/app_runtime_transaction_provider.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import { AgentComputeProviderRegistry } from "../environments/providers/provider_registry.ts";
import type { AgentEnvironmentRecord } from "../environments/providers/provider_interface.ts";
import { WorkflowSchedulerSyncService } from "../workflows/scheduler_sync.ts";

type CompanyDeletionExecutorCompanyRecord = {
  id: string;
  name: string;
  slug: string | null;
};

type TriggerIdRow = {
  id: string;
};

/**
 * Performs the destructive company cleanup sequence shared by queued self-service deletion and
 * immediate platform-admin deletion, keeping external side effects ahead of the final DB cascade.
 */
@injectable()
export class CompanyDeletionExecutor {
  private readonly adminDatabase: AdminDatabase;
  private readonly appRuntimeDatabase: AppRuntimeDatabase;
  private readonly logger: PinoLogger;
  private readonly providerRegistry: AgentComputeProviderRegistry;
  private readonly workflowSchedulerSyncService: WorkflowSchedulerSyncService;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(AppRuntimeDatabase) appRuntimeDatabase: AppRuntimeDatabase,
    @inject(AgentComputeProviderRegistry) providerRegistry: AgentComputeProviderRegistry,
    @inject(WorkflowSchedulerSyncService) workflowSchedulerSyncService: WorkflowSchedulerSyncService,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    this.adminDatabase = adminDatabase;
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.logger = logger.child({
      component: "company_deletion_executor",
    });
    this.providerRegistry = providerRegistry;
    this.workflowSchedulerSyncService = workflowSchedulerSyncService;
  }

  async deleteCompany(input: {
    companyId: string;
  }): Promise<CompanyDeletionExecutorCompanyRecord> {
    const company = await this.loadCompany(input.companyId);

    await this.removeWorkflowSchedules(company.id);
    await this.deleteProviderEnvironments(company.id);
    await this.deleteCompanyRow(company.id);
    await this.completeOpenDeletionRequests(company.id);
    this.logger.info({
      companyId: company.id,
    }, "deleted company immediately");

    return company;
  }

  async loadCompany(companyId: string): Promise<CompanyDeletionExecutorCompanyRecord> {
    const sql = this.adminDatabase.getSqlClient();
    const [company] = await sql<CompanyDeletionExecutorCompanyRecord[]>`
      SELECT
        id,
        name,
        slug
      FROM companies
      WHERE id = ${companyId}
      LIMIT 1
    `;
    if (!company) {
      throw new Error("Company not found.");
    }

    return company;
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

  private async deleteCompanyRow(companyId: string): Promise<void> {
    const sql = this.adminDatabase.getSqlClient();
    await sql`
      DELETE FROM companies
      WHERE id = ${companyId}
    `;
  }

  private async completeOpenDeletionRequests(companyId: string): Promise<void> {
    const sql = this.adminDatabase.getSqlClient();
    await sql`
      UPDATE company_deletion_requests
      SET
        completed_at = COALESCE(completed_at, now()),
        locked_at = NULL,
        locked_by = NULL,
        next_attempt_at = NULL,
        status = 'completed',
        updated_at = now()
      WHERE company_id = ${companyId}
        AND status IN ('requested', 'processing', 'failed')
    `;
  }
}
