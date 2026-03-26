import { injectable } from "inversify";

/**
 * Owns the queue and worker-coordination names for session processing. Its scope is the internal
 * execution flow that wakes workers, nudges active sessions with steer events, and keeps the Redis
 * lease key format consistent across the queue stack.
 */
@injectable()
export class SessionProcessQueuedNames {
  getWakeQueueName(): string {
    return "agent-session-process";
  }

  getWakeJobName(): string {
    return "wake";
  }

  getSessionSteerChannel(sessionId: string): string {
    return `session:${sessionId}:steer`;
  }

  getSessionLeaseKey(sessionId: string): string {
    return `session:${sessionId}:lease`;
  }
}
