import { Queue } from "bullmq";
import { Redis as IORedis } from "ioredis";
import { inject, injectable } from "inversify";
import { Config } from "../../../config/schema.ts";
import type { SessionTurnUsageRecordInput } from "./session_turn_usage_service.ts";
import { SessionTurnUsageQueueNames } from "./session_turn_usage_queue_names.ts";

export type SessionTurnUsageJobPayload = Omit<SessionTurnUsageRecordInput, "recordedAt"> & {
  recordedAt: Date | string;
};

/**
 * Owns best-effort BullMQ dispatch for finalized usage payloads. Its scope is queue durability and
 * job options only; the actual ledger mutation stays in SessionTurnUsageProcessor.
 */
@injectable()
export class SessionTurnUsageQueueService {
  private readonly connection: IORedis;
  private readonly names: SessionTurnUsageQueueNames;
  private readonly queue: Queue<SessionTurnUsageJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(SessionTurnUsageQueueNames) names: SessionTurnUsageQueueNames = new SessionTurnUsageQueueNames(),
  ) {
    this.names = names;
    this.connection = new IORedis({
      host: config.redis.host,
      maxRetriesPerRequest: null,
      password: config.redis.password || undefined,
      port: config.redis.port,
      username: config.redis.username || undefined,
    });
    this.queue = new Queue<SessionTurnUsageJobPayload>(this.names.getQueueName(), {
      connection: this.connection,
    });
  }

  async enqueueUsage(input: SessionTurnUsageJobPayload): Promise<void> {
    await this.queue.add(this.names.getRecordJobName(), input, {
      attempts: 5,
      backoff: {
        delay: 10_000,
        type: "exponential",
      },
      jobId: this.names.getRecordJobId(input.turnId),
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 10_000,
      },
      removeOnFail: {
        age: 7 * 24 * 60 * 60,
        count: 5_000,
      },
    });
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
