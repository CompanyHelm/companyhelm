import { inject, injectable } from "inversify";
import { AdminDatabase } from "../../db/admin_database.ts";
import { WorkflowTriggerQueueService } from "./queue.ts";
import type { WorkflowCronTriggerScheduleRecord } from "./types.ts";

type WorkflowCronSchedulerState = {
  schedule: WorkflowCronTriggerScheduleRecord | null;
  triggerId: string;
};

type WorkflowCronSchedulerStateRow = WorkflowCronTriggerScheduleRecord & {
  triggerEnabled: boolean;
  workflowEnabled: boolean;
};

/**
 * Reconciles workflow cron trigger rows into BullMQ Job Schedulers at startup and after trigger
 * mutations. Postgres remains the source of truth while BullMQ owns wake timing.
 */
@injectable()
export class WorkflowSchedulerSyncService {
  private readonly adminDatabase: AdminDatabase;
  private readonly triggerQueueService: WorkflowTriggerQueueService;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(WorkflowTriggerQueueService) triggerQueueService: WorkflowTriggerQueueService,
  ) {
    this.adminDatabase = adminDatabase;
    this.triggerQueueService = triggerQueueService;
  }

  async syncEnabledCronTriggers(): Promise<void> {
    const states = await this.listCronSchedulerStates();

    for (const state of states) {
      if (!state.schedule) {
        await this.triggerQueueService.removeTrigger(state.triggerId);
        continue;
      }

      await this.triggerQueueService.upsertCronTrigger(state.schedule);
    }
  }

  async syncCronTrigger(
    schedule: WorkflowCronTriggerScheduleRecord | null,
    triggerId: string,
  ): Promise<void> {
    if (!schedule) {
      await this.triggerQueueService.removeTrigger(triggerId);
      return;
    }

    await this.triggerQueueService.upsertCronTrigger(schedule);
  }

  async removeCronTrigger(triggerId: string): Promise<void> {
    await this.triggerQueueService.removeTrigger(triggerId);
  }

  private async listCronSchedulerStates(): Promise<WorkflowCronSchedulerState[]> {
    const sql = this.adminDatabase.getSqlClient();
    const rows = await sql<WorkflowCronSchedulerStateRow[]>`
      SELECT
        workflow_triggers.agent_id AS "agentId",
        workflow_triggers.company_id AS "companyId",
        workflow_triggers.id AS "id",
        workflow_triggers.workflow_definition_id AS "workflowDefinitionId",
        workflow_triggers.enabled AS "triggerEnabled",
        workflow_definitions.is_enabled AS "workflowEnabled",
        workflow_cron_triggers.cron_pattern AS "cronPattern",
        workflow_cron_triggers.timezone AS "timezone"
      FROM workflow_triggers
      INNER JOIN workflow_definitions
        ON workflow_definitions.id = workflow_triggers.workflow_definition_id
        AND workflow_definitions.company_id = workflow_triggers.company_id
      INNER JOIN workflow_cron_triggers
        ON workflow_cron_triggers.trigger_id = workflow_triggers.id
        AND workflow_cron_triggers.company_id = workflow_triggers.company_id
    `;

    return rows.map((row) => {
      if (!row.workflowEnabled || !row.triggerEnabled) {
        return {
          schedule: null,
          triggerId: row.id,
        };
      }

      return {
        schedule: {
          agentId: row.agentId,
          companyId: row.companyId,
          cronPattern: row.cronPattern,
          id: row.id,
          timezone: row.timezone,
          workflowDefinitionId: row.workflowDefinitionId,
        },
        triggerId: row.id,
      };
    });
  }
}
