import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import {
  sessionQueuedMessageImages,
  sessionQueuedMessages,
} from "../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";

type QueuedMessageRow = {
  companyId: string;
  createdAt: Date;
  id: string;
  sessionId: string;
  shouldSteer: boolean;
  status: string;
  text: string;
  updatedAt: Date;
};

type QueuedMessageImageRow = {
  base64EncodedImage: string;
  companyId: string;
  createdAt: Date;
  id: string;
  mimeType: string;
  sessionQueuedMessageId: string;
  updatedAt: Date;
};

export type QueuedSessionMessageImageRecord = {
  base64EncodedImage: string;
  id: string;
  mimeType: string;
};

export type QueuedSessionMessageRecord = {
  createdAt: Date;
  id: string;
  images: QueuedSessionMessageImageRecord[];
  sessionId: string;
  shouldSteer: boolean;
  status: string;
  text: string;
  updatedAt: Date;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): Promise<unknown>;
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<unknown>;
    };
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
};

/**
 * Owns persistence of queued inbound session messages before a worker delivers them to PI Mono. Its
 * scope is limited to queue-state records in Postgres, including optional queued images and the
 * delete-on-processed lifecycle used by the worker flow.
 */
@injectable()
export class SessionQueuedMessageService {
  async enqueue(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      images?: Array<{ base64EncodedImage: string; mimeType: string }>;
      sessionId: string;
      shouldSteer: boolean;
      text: string;
    },
  ): Promise<{ id: string }> {
    const queuedMessageId = crypto.randomUUID();
    const timestamp = new Date();

    await transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      await insertableDatabase.insert(sessionQueuedMessages).values({
        companyId: input.companyId,
        createdAt: timestamp,
        id: queuedMessageId,
        sessionId: input.sessionId,
        shouldSteer: input.shouldSteer,
        status: "pending",
        text: input.text,
        updatedAt: timestamp,
      });

      const imageRecords = (input.images ?? []).map((image) => ({
        base64EncodedImage: image.base64EncodedImage,
        companyId: input.companyId,
        createdAt: timestamp,
        id: crypto.randomUUID(),
        mimeType: image.mimeType,
        sessionQueuedMessageId: queuedMessageId,
        updatedAt: timestamp,
      }));
      if (imageRecords.length > 0) {
        await insertableDatabase.insert(sessionQueuedMessageImages).values(imageRecords);
      }
    });

    return {
      id: queuedMessageId,
    };
  }

  async listPending(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<QueuedSessionMessageRecord[]> {
    return this.listForFilter(transactionProvider, companyId, sessionId);
  }

  async listPendingSteer(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<QueuedSessionMessageRecord[]> {
    const queuedMessages = await this.listForFilter(transactionProvider, companyId, sessionId);
    return queuedMessages.filter((queuedMessage) => queuedMessage.shouldSteer);
  }

  async markProcessing(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(sessionQueuedMessages)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(and(
          eq(sessionQueuedMessages.companyId, companyId),
          inArray(sessionQueuedMessages.id, ids),
        ));
    });
  }

  async deleteProcessed(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await transactionProvider.transaction(async (tx) => {
      const deletableDatabase = tx as DeletableDatabase;
      await deletableDatabase
        .delete(sessionQueuedMessages)
        .where(and(
          eq(sessionQueuedMessages.companyId, companyId),
          inArray(sessionQueuedMessages.id, ids),
        ));
    });
  }

  async hasPendingMessages(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<boolean> {
    const queuedMessages = await this.listPending(transactionProvider, companyId, sessionId);
    return queuedMessages.length > 0;
  }

  private async listForFilter(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<QueuedSessionMessageRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const queuedMessages = await selectableDatabase
        .select({
          companyId: sessionQueuedMessages.companyId,
          createdAt: sessionQueuedMessages.createdAt,
          id: sessionQueuedMessages.id,
          sessionId: sessionQueuedMessages.sessionId,
          shouldSteer: sessionQueuedMessages.shouldSteer,
          status: sessionQueuedMessages.status,
          text: sessionQueuedMessages.text,
          updatedAt: sessionQueuedMessages.updatedAt,
        })
        .from(sessionQueuedMessages)
        .where(and(
          eq(sessionQueuedMessages.companyId, companyId),
          eq(sessionQueuedMessages.sessionId, sessionId),
          eq(sessionQueuedMessages.status, "pending"),
        )) as QueuedMessageRow[];
      if (queuedMessages.length === 0) {
        return [];
      }

      const queuedMessageIds = queuedMessages.map((queuedMessage) => queuedMessage.id);
      const queuedMessageImages = await selectableDatabase
        .select({
          base64EncodedImage: sessionQueuedMessageImages.base64EncodedImage,
          companyId: sessionQueuedMessageImages.companyId,
          createdAt: sessionQueuedMessageImages.createdAt,
          id: sessionQueuedMessageImages.id,
          mimeType: sessionQueuedMessageImages.mimeType,
          sessionQueuedMessageId: sessionQueuedMessageImages.sessionQueuedMessageId,
          updatedAt: sessionQueuedMessageImages.updatedAt,
        })
        .from(sessionQueuedMessageImages)
        .where(and(
          eq(sessionQueuedMessageImages.companyId, companyId),
          inArray(sessionQueuedMessageImages.sessionQueuedMessageId, queuedMessageIds),
        )) as QueuedMessageImageRow[];

      const imagesByQueuedMessageId = new Map<string, QueuedSessionMessageImageRecord[]>();
      for (const queuedMessageImage of queuedMessageImages) {
        const images = imagesByQueuedMessageId.get(queuedMessageImage.sessionQueuedMessageId) ?? [];
        images.push({
          base64EncodedImage: queuedMessageImage.base64EncodedImage,
          id: queuedMessageImage.id,
          mimeType: queuedMessageImage.mimeType,
        });
        imagesByQueuedMessageId.set(queuedMessageImage.sessionQueuedMessageId, images);
      }

      return [...queuedMessages]
        .sort((leftMessage, rightMessage) => leftMessage.createdAt.getTime() - rightMessage.createdAt.getTime())
        .map((queuedMessage) => ({
          createdAt: queuedMessage.createdAt,
          id: queuedMessage.id,
          images: imagesByQueuedMessageId.get(queuedMessage.id) ?? [],
          sessionId: queuedMessage.sessionId,
          shouldSteer: queuedMessage.shouldSteer,
          status: queuedMessage.status,
          text: queuedMessage.text,
          updatedAt: queuedMessage.updatedAt,
        }));
    });
  }
}
