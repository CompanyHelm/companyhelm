import { injectable } from "inversify";

/**
 * Centralizes BullMQ names for routine trigger jobs so scheduler creation and worker consumption
 * cannot drift as new trigger types are added beyond cron.
 */
@injectable()
export class RoutineQueueNames {
  getTriggerQueueName(): string {
    return "routine-triggers";
  }

  getTriggerJobName(): string {
    return "run-routine";
  }
}
