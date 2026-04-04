import { injectable } from "inversify";
import type { QueuedSessionMessageImageRecord, QueuedSessionMessageRecord } from "./queued_messages.ts";

export type SessionQueuedMessageImageGraphqlRecord = {
  base64EncodedImage: string;
  id: string;
  mimeType: string;
};

export type SessionQueuedMessageGraphqlRecord = {
  createdAt: string;
  id: string;
  images: SessionQueuedMessageImageGraphqlRecord[];
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
      images: record.images.map((image) => this.serializeImage(image)),
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

  private serializeImage(image: QueuedSessionMessageImageRecord): SessionQueuedMessageImageGraphqlRecord {
    return {
      base64EncodedImage: image.base64EncodedImage,
      id: image.id,
      mimeType: image.mimeType,
    };
  }
}
