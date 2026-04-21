import { inject, injectable } from "inversify";
import { Redis as IORedis } from "ioredis";
import { Queue } from "bullmq";
import { Config } from "../../config/schema.ts";
import { WorkflowQueueNames } from "./queue_names.ts";
import type { WorkflowCronTriggerScheduleRecord, WorkflowTriggerJobPayload } from "./types.ts";

/**
 * Owns the BullMQ producer side for scheduled workflow runs. It stores only trigger identity in
 * the queued payload so workers always re-read the current workflow, agent, and input state.
 */
@injectable()
export class WorkflowTriggerQueueService {
  private readonly connection: IORedis;
  private readonly names: WorkflowQueueNames;
  private readonly queue: Queue<WorkflowTriggerJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(WorkflowQueueNames) names: WorkflowQueueNames = new WorkflowQueueNames(),
  ) {
    this.names = names;
    this.connection = new IORedis({
      host: config.redis.host,
      maxRetriesPerRequest: null,
      password: config.redis.password || undefined,
      port: config.redis.port,
      username: config.redis.username || undefined,
    });
    this.queue = new Queue<WorkflowTriggerJobPayload>(this.names.getTriggerQueueName(), {
      connection: this.connection,
    });
  }

  async upsertCronTrigger(trigger: WorkflowCronTriggerScheduleRecord): Promise<void> {
    await this.queue.upsertJobScheduler(
      trigger.id,
      {
        immediately: false,
        pattern: trigger.cronPattern,
        tz: trigger.timezone,
      },
      {
        data: {
          companyId: trigger.companyId,
          triggerId: trigger.id,
          workflowDefinitionId: trigger.workflowDefinitionId,
        },
        name: this.names.getTriggerJobName(),
        opts: {
          attempts: 3,
          backoff: {
            delay: 2_000,
            type: "exponential",
          },
          removeOnComplete: true,
          removeOnFail: true,
        },
      },
    );
  }

  async removeTrigger(triggerId: string): Promise<void> {
    await this.queue.removeJobScheduler(triggerId);
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
