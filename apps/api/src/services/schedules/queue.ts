import { inject, injectable } from "inversify";
import { Redis as IORedis } from "ioredis";
import { Queue } from "bullmq";
import { Config } from "../../config/schema.ts";
import { ScheduleQueueNames } from "./queue_names.ts";
import type { CronScheduleQueueRecord, ScheduleJobPayload } from "./types.ts";

/**
 * Owns the shared BullMQ producer for every cron-backed durable schedule. Payloads keep only the
 * schedule identity so workers always reload the latest workflow or queued-message configuration
 * from Postgres before executing.
 */
@injectable()
export class ScheduleQueueService {
  private readonly connection: IORedis;
  private readonly names: ScheduleQueueNames;
  private readonly queue: Queue<ScheduleJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(ScheduleQueueNames) names: ScheduleQueueNames = new ScheduleQueueNames(),
  ) {
    this.names = names;
    this.connection = new IORedis({
      host: config.redis.host,
      maxRetriesPerRequest: null,
      password: config.redis.password || undefined,
      port: config.redis.port,
      username: config.redis.username || undefined,
    });
    this.queue = new Queue<ScheduleJobPayload>(this.names.getScheduleQueueName(), {
      connection: this.connection,
    });
  }

  async upsertCronSchedule(schedule: CronScheduleQueueRecord): Promise<void> {
    await this.queue.upsertJobScheduler(
      schedule.scheduleId,
      {
        immediately: false,
        pattern: schedule.cronPattern,
        tz: schedule.timezone,
      },
      {
        data: {
          companyId: schedule.companyId,
          scheduleId: schedule.scheduleId,
          scheduleType: schedule.scheduleType,
        },
        name: this.names.getScheduleJobName(),
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

  async removeSchedule(scheduleId: string): Promise<void> {
    await this.queue.removeJobScheduler(scheduleId);
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
