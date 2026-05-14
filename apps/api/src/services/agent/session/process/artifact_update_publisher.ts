import { inject, injectable } from "inversify";
import { RedisCompanyScopedService } from "../../../redis/company_scoped_service.ts";
import { RedisService } from "../../../redis/service.ts";
import { SessionProcessPubSubNames } from "./pub_sub_names.ts";

/**
 * Publishes one lightweight session-scoped artifact invalidation signal so GraphQL subscribers can
 * reload the canonical artifact list from Postgres whenever a session artifact changes.
 */
@injectable()
export class SessionArtifactUpdatePublisher {
  private readonly redisService: RedisService | null;
  private readonly sessionProcessPubSubNames: SessionProcessPubSubNames;

  constructor(
    @inject(RedisService) redisService?: RedisService,
    @inject(SessionProcessPubSubNames)
    sessionProcessPubSubNames: SessionProcessPubSubNames = new SessionProcessPubSubNames(),
  ) {
    this.redisService = redisService ?? null;
    this.sessionProcessPubSubNames = sessionProcessPubSubNames;
  }

  async publish(companyId: string, sessionId: string | null): Promise<void> {
    if (!sessionId || !this.redisService) {
      return;
    }

    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(this.sessionProcessPubSubNames.getSessionArtifactsUpdateChannel(sessionId));
  }
}
