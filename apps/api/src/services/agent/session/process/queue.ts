import { inject, injectable } from "inversify";
import IORedis from "ioredis";
import { Queue } from "bullmq";
import { Config } from "../../../../config/schema.ts";
import { SessionProcessQueuedNames } from "./queued_names.ts";

export type SessionWakeJobPayload = {
  companyId: string;
  sessionId: string;
};

export type SessionWakeQueueOptions = {
  delayMilliseconds?: number;
};

/**
 * Owns the BullMQ queue used to wake session-processing workers. Its scope is queue configuration
 * and graceful queue shutdown for the API process. Wake jobs intentionally do not use a
 * deterministic job id because a running wake job may need to enqueue a follow-up wake before the
 * current BullMQ job completes.
 */
@injectable()
export class SessionProcessQueueService {
  private readonly names: SessionProcessQueuedNames;
  private readonly queue: Queue<SessionWakeJobPayload>;
  private readonly connection: IORedis;

  constructor(
    @inject(Config) config: Config,
    @inject(SessionProcessQueuedNames) names: SessionProcessQueuedNames = new SessionProcessQueuedNames(),
  ) {
    this.names = names;
    this.connection = new IORedis({
      host: config.redis.host,
      maxRetriesPerRequest: null,
      password: config.redis.password || undefined,
      port: config.redis.port,
      username: config.redis.username || undefined,
    });
    this.queue = new Queue<SessionWakeJobPayload>(this.names.getWakeQueueName(), {
      connection: this.connection,
    });
  }

  async enqueueSessionWake(
    companyId: string,
    sessionId: string,
    options: SessionWakeQueueOptions = {},
  ): Promise<void> {
    await this.queue.add(
      this.names.getWakeJobName(),
      {
        companyId,
        sessionId,
      },
      {
        attempts: 3,
        backoff: {
          delay: 2_000,
          type: "exponential",
        },
        delay: options.delayMilliseconds,
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.connection.quit();
  }
}
