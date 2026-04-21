import { injectable } from "inversify";

/**
 * Centralizes BullMQ names for workflow trigger jobs so scheduler creation and worker consumption
 * stay aligned as workflow trigger types expand beyond cron.
 */
@injectable()
export class WorkflowQueueNames {
  getTriggerQueueName(): string {
    return "workflow-triggers";
  }

  getTriggerJobName(): string {
    return "run-workflow";
  }
}
