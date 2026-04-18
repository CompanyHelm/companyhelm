import { inject, injectable } from "inversify";
import { AdminDatabase } from "../../db/admin_database.ts";
import { RoutineTriggerQueueService } from "./queue.ts";
import type { RoutineCronTriggerScheduleRecord } from "./types.ts";

type RoutineCronSchedulerState = {
  schedule: RoutineCronTriggerScheduleRecord | null;
  triggerId: string;
};

type RoutineCronSchedulerStateRow = RoutineCronTriggerScheduleRecord & {
  routineEnabled: boolean;
  triggerEnabled: boolean;
};

/**
 * Reconciles persisted routine cron triggers into BullMQ Job Schedulers during API startup and
 * after trigger mutations. The database remains the source of truth while BullMQ owns wake timing.
 */
@injectable()
export class RoutineSchedulerSyncService {
  private readonly adminDatabase: AdminDatabase;
  private readonly triggerQueueService: RoutineTriggerQueueService;

  constructor(
    @inject(AdminDatabase) adminDatabase: AdminDatabase,
    @inject(RoutineTriggerQueueService) triggerQueueService: RoutineTriggerQueueService,
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
    schedule: RoutineCronTriggerScheduleRecord | null,
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

  private async listCronSchedulerStates(): Promise<RoutineCronSchedulerState[]> {
    const sql = this.adminDatabase.getSqlClient();
    const rows = await sql<RoutineCronSchedulerStateRow[]>`
      SELECT
        routine_triggers.company_id AS "companyId",
        routine_triggers.id AS "id",
        routine_triggers.routine_id AS "routineId",
        routine_triggers.enabled AS "triggerEnabled",
        routines.enabled AS "routineEnabled",
        routine_cron_triggers.cron_pattern AS "cronPattern",
        routine_cron_triggers.timezone AS "timezone"
      FROM routine_triggers
      INNER JOIN routines
        ON routines.id = routine_triggers.routine_id
        AND routines.company_id = routine_triggers.company_id
      INNER JOIN routine_cron_triggers
        ON routine_cron_triggers.trigger_id = routine_triggers.id
        AND routine_cron_triggers.company_id = routine_triggers.company_id
    `;

    return rows.map((row) => {
      if (!row.routineEnabled || !row.triggerEnabled) {
        return {
          schedule: null,
          triggerId: row.id,
        };
      }

      return {
        schedule: {
          companyId: row.companyId,
          cronPattern: row.cronPattern,
          id: row.id,
          routineId: row.routineId,
          timezone: row.timezone,
        },
        triggerId: row.id,
      };
    });
  }
}
