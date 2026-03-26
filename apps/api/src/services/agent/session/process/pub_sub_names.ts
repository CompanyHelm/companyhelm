import { injectable } from "inversify";

/**
 * Owns the Redis pub/sub channel names that fan out persisted session and message updates to
 * subscribers. Its scope is the external notification surface used by GraphQL subscriptions and
 * other listeners that reload canonical state from Postgres after a signal arrives.
 */
@injectable()
export class SessionProcessPubSubNames {
  getSessionUpdateChannel(sessionId: string): string {
    return `session:${sessionId}:update`;
  }

  getSessionUpdatePattern(): string {
    return "session:*:update";
  }

  getSessionMessageUpdateChannel(sessionId: string, messageId: string): string {
    return `session:${sessionId}:message:${messageId}:update`;
  }

  getSessionMessageUpdatePattern(sessionId: string): string {
    return `session:${sessionId}:message:*:update`;
  }
}
