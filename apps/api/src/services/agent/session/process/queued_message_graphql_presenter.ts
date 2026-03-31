import { injectable } from "inversify";
import type { QueuedSessionMessageRecord } from "./queued_messages.ts";

export type SessionQueuedMessageGraphqlRecord = {
  createdAt: string;
  id: string;
  sessionId: string;
  shouldSteer: boolean;
  status: string;
  text: string;
  updatedAt: string;
};

/**
 * Projects queued session-message rows into the GraphQL shape consumed by the web chat composer.
 * Its scope is the transport-facing serialization layer so queue persistence stays decoupled from
 * the API contract.
 */
@injectable()
export class SessionQueuedMessageGraphqlPresenter {
  serialize(record: QueuedSessionMessageRecord): SessionQueuedMessageGraphqlRecord {
    return {
      createdAt: record.createdAt.toISOString(),
      id: record.id,
      sessionId: record.sessionId,
      shouldSteer: record.shouldSteer,
      status: record.status,
      text: record.text,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  serializeMany(records: ReadonlyArray<QueuedSessionMessageRecord>): SessionQueuedMessageGraphqlRecord[] {
    return records.map((record) => this.serialize(record));
  }
}
