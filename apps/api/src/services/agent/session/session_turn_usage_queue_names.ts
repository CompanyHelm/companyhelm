import { injectable } from "inversify";

/**
 * Centralizes BullMQ naming for async session-turn usage jobs so producers and workers agree on
 * queue identity, job names, and deterministic job ids for one finalized usage payload per turn.
 */
@injectable()
export class SessionTurnUsageQueueNames {
  getQueueName(): string {
    return "session_turn_usage";
  }

  getRecordJobName(): string {
    return "record_usage";
  }

  getRecordJobId(turnId: string): string {
    return `session-turn-usage-${turnId}`;
  }
}
