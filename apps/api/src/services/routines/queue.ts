import { inject, injectable } from "inversify";
import { Redis as IORedis } from "ioredis";
import { Queue } from "bullmq";
import { Config } from "../../config/schema.ts";
import { RoutineQueueNames } from "./queue_names.ts";
import type { RoutineCronTriggerScheduleRecord, RoutineTriggerJobPayload } from "./types.ts";

/**
 * Owns the BullMQ producer side for routine trigger jobs. It maps persisted cron trigger records
 * into BullMQ Job Schedulers and keeps the immediate job payload small enough for workers to
 * re-read authoritative routine state from Postgres.
 */
@injectable()
export class RoutineTriggerQueueService {
  private readonly connection: IORedis;
  private readonly names: RoutineQueueNames;
  private readonly queue: Queue<RoutineTriggerJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(RoutineQueueNames) names: RoutineQueueNames = new RoutineQueueNames(),
  ) {
    this.names = names;
    this.connection = new IORedis({
      host: config.redis.host,
      maxRetriesPerRequest: null,
      password: config.redis.password || undefined,
      port: config.redis.port,
      username: config.redis.username || undefined,
    });
    this.queue = new Queue<RoutineTriggerJobPayload>(this.names.getTriggerQueueName(), {
      connection: this.connection,
    });
  }

  async upsertCronTrigger(trigger: RoutineCronTriggerScheduleRecord): Promise<void> {
    await this.queue.upsertJobScheduler(
      trigger.id,
      {
        ...(trigger.endAt ? { endDate: trigger.endAt } : {}),
        ...(trigger.limit ? { limit: trigger.limit } : {}),
        ...(trigger.startAt ? { startDate: trigger.startAt } : {}),
        immediately: false,
        pattern: trigger.cronPattern,
        tz: trigger.timezone,
      },
      {
        name: this.names.getTriggerJobName(),
        data: {
          companyId: trigger.companyId,
          routineId: trigger.routineId,
          triggerId: trigger.id,
        },
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
