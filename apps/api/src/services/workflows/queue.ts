import { inject, injectable } from "inversify";
import { ScheduleQueueService } from "../schedules/queue.ts";
import type { WorkflowCronTriggerScheduleRecord } from "./types.ts";

/**
 * Preserves the workflow-facing scheduler API while delegating the shared BullMQ wiring to the
 * schedule queue. Workflow callers stay focused on trigger records instead of generic queue types.
 */
@injectable()
export class WorkflowTriggerQueueService {
  private readonly scheduleQueueService: ScheduleQueueService;

  constructor(
    @inject(ScheduleQueueService) scheduleQueueService: ScheduleQueueService,
  ) {
    this.scheduleQueueService = scheduleQueueService;
  }

  async upsertCronTrigger(trigger: WorkflowCronTriggerScheduleRecord): Promise<void> {
    await this.scheduleQueueService.upsertCronSchedule({
      companyId: trigger.companyId,
      cronPattern: trigger.cronPattern,
      scheduleId: trigger.id,
      scheduleType: "workflow",
      timezone: trigger.timezone,
    });
  }

  async removeTrigger(triggerId: string): Promise<void> {
    await this.scheduleQueueService.removeSchedule(triggerId);
  }

  async close(): Promise<void> {
    await this.scheduleQueueService.close();
  }
}
