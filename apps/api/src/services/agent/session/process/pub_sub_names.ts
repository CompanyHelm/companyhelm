import { injectable } from "inversify";

/**
 * Owns the Redis pub/sub channel names that fan out persisted session and message updates to
 * subscribers. Its scope is the external notification surface used by GraphQL subscriptions and
 * other listeners that reload canonical state from Postgres after a signal arrives.
 */
@injectable()
export class SessionProcessPubSubNames {
  getSessionQueuedMessagesUpdateChannel(sessionId: string): string {
    return `session:${sessionId}:queued:update`;
  }

  getSessionQueuedMessagesUpdatePattern(sessionId: string): string {
    return this.getSessionQueuedMessagesUpdateChannel(sessionId);
  }

  getSessionUpdateChannel(sessionId: string): string {
    return `session:${sessionId}:update`;
  }

  getSessionUpdatePattern(): string {
    return "session:*:update";
  }

  getSessionInboxHumanQuestionsUpdateChannel(sessionId: string): string {
    return `session:${sessionId}:inbox:update`;
  }

  getSessionInboxHumanQuestionsUpdatePattern(sessionId: string): string {
    return this.getSessionInboxHumanQuestionsUpdateChannel(sessionId);
  }

  getSessionMessageUpdateChannel(sessionId: string, messageId: string): string {
    return `session:${sessionId}:message:${messageId}:update`;
  }

  getSessionMessageUpdatePattern(sessionId: string): string {
    return `session:${sessionId}:message:*:update`;
  }
}
