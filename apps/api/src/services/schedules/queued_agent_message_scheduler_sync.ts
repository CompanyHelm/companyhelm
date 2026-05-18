import { inject, injectable } from "inversify";
import { AdminDatabase } from "../../db/admin_database.ts";
import { ScheduleQueueService } from "./queue.ts";

type QueuedAgentMessageSchedulerRow = {
  companyId: string;
  cronPattern: string;
  enabled: boolean;
  id: string;
  timezone: string;
};

/**
 * Reconciles enabled queued-agent-message schedules from Postgres into BullMQ job schedulers at
 * startup so redis-owned cron state is rebuilt deterministically after restarts.
 */
@injectable()
export class QueuedAgentMessageSchedulerSyncService {
  constructor(
    @inject(AdminDatabase) private readonly adminDatabase: AdminDatabase,
    @inject(ScheduleQueueService) private readonly scheduleQueueService: ScheduleQueueService,
  ) {}

  async syncEnabledSchedules(): Promise<void> {
    const sql = this.adminDatabase.getSqlClient();
    const rows = await sql<QueuedAgentMessageSchedulerRow[]>`
      SELECT
        queued_agent_message_schedules.company_id AS "companyId",
        queued_agent_message_schedules.cron_pattern AS "cronPattern",
        schedules.enabled AS "enabled",
        queued_agent_message_schedules.schedule_id AS "id",
        queued_agent_message_schedules.timezone AS "timezone"
      FROM queued_agent_message_schedules
      INNER JOIN schedules
        ON schedules.id = queued_agent_message_schedules.schedule_id
      WHERE schedules.type = 'queued_agent_message'
    `;

    for (const row of rows) {
      if (!row.enabled) {
        await this.scheduleQueueService.removeSchedule(row.id);
        continue;
      }

      await this.scheduleQueueService.upsertCronSchedule({
        companyId: row.companyId,
        cronPattern: row.cronPattern,
        scheduleId: row.id,
        scheduleType: "queued_agent_message",
        timezone: row.timezone,
      });
    }
  }
}
