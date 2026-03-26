import { randomUUID } from "node:crypto";
import { inject, injectable } from "inversify";
import { RedisService } from "../../../redis/service.ts";
import { SessionProcessQueuedNames } from "./queued_names.ts";

export type SessionLeaseHandle = {
  companyId: string;
  sessionId: string;
  token: string;
};

/**
 * Owns Redis-backed lease acquisition for live session execution. Its scope is ensuring that only
 * one worker process drives a given session at a time by using expiring, token-based Redis keys.
 */
@injectable()
export class SessionLeaseService {
  static readonly LEASE_TTL_MILLISECONDS = 30_000;
  private static readonly HEARTBEAT_SCRIPT = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("PEXPIRE", KEYS[1], ARGV[2])
    end
    return 0
  `;
  private static readonly RELEASE_SCRIPT = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    end
    return 0
  `;

  private readonly redisService: RedisService;
  private readonly queuedNames: SessionProcessQueuedNames;

  constructor(
    @inject(RedisService) redisService: RedisService,
    @inject(SessionProcessQueuedNames) queuedNames: SessionProcessQueuedNames = new SessionProcessQueuedNames(),
  ) {
    this.redisService = redisService;
    this.queuedNames = queuedNames;
  }

  async acquire(companyId: string, sessionId: string): Promise<SessionLeaseHandle | null> {
    const key = this.buildScopedLeaseKey(companyId, sessionId);
    const token = randomUUID();
    const client = await this.redisService.getClient();
    const result = await client.set(key, token, {
      NX: true,
      PX: SessionLeaseService.LEASE_TTL_MILLISECONDS,
    });
    if (result !== "OK") {
      return null;
    }

    return {
      companyId,
      sessionId,
      token,
    };
  }

  async heartbeat(handle: SessionLeaseHandle): Promise<boolean> {
    const client = await this.redisService.getClient();
    const key = this.buildScopedLeaseKey(handle.companyId, handle.sessionId);
    const result = await client.eval(SessionLeaseService.HEARTBEAT_SCRIPT, {
      arguments: [handle.token, String(SessionLeaseService.LEASE_TTL_MILLISECONDS)],
      keys: [key],
    });
    return Number(result) === 1;
  }

  async release(handle: SessionLeaseHandle): Promise<void> {
    const client = await this.redisService.getClient();
    const key = this.buildScopedLeaseKey(handle.companyId, handle.sessionId);
    await client.eval(SessionLeaseService.RELEASE_SCRIPT, {
      arguments: [handle.token],
      keys: [key],
    });
  }

  private buildScopedLeaseKey(companyId: string, sessionId: string): string {
    return `company:${companyId}:${this.queuedNames.getSessionLeaseKey(sessionId)}`;
  }
}
