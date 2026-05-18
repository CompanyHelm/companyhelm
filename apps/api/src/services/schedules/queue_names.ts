import { injectable } from "inversify";

/**
 * Centralizes BullMQ naming for durable schedules so workflow and queued-message schedules share
 * one scheduler transport without hard-coding queue names in every caller.
 */
@injectable()
export class ScheduleQueueNames {
  getScheduleQueueName(): string {
    return "schedules";
  }

  getScheduleJobName(): string {
    return "run-schedule";
  }
}
