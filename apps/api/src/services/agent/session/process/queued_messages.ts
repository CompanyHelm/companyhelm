import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import {
  sessionQueuedMessageImages,
  sessionQueuedMessageStatusEnum,
  sessionQueuedMessages,
} from "../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";

type SessionQueuedMessageStatus = (typeof sessionQueuedMessageStatusEnum.enumValues)[number];

type QueuedMessageRow = {
  companyId: string;
  createdAt: Date;
  id: string;
  sessionId: string;
  shouldSteer: boolean;
  status: SessionQueuedMessageStatus;
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
  status: SessionQueuedMessageStatus;
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
    return transactionProvider.transaction(async (tx) => {
      return this.enqueueInTransaction(tx as InsertableDatabase, input);
    });
  }

  async enqueueInTransaction(
    insertableDatabase: InsertableDatabase,
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

    return {
      id: queuedMessageId,
    };
  }

  async listProcessable(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<QueuedSessionMessageRecord[]> {
    // Only rows that have not been claimed yet may start a fresh wake pass. Replaying rows already
    // marked `processing` is unsafe because the live PI Mono runtime is still process-local.
    return this.listPending(transactionProvider, companyId, sessionId);
  }

  async listPending(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<QueuedSessionMessageRecord[]> {
    return this.listForFilter(transactionProvider, companyId, sessionId, ["pending"]);
  }

  async listPendingSteer(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<QueuedSessionMessageRecord[]> {
    const queuedMessages = await this.listForFilter(transactionProvider, companyId, sessionId, ["pending"]);
    return queuedMessages.filter((queuedMessage) => queuedMessage.shouldSteer);
  }

  async markSteer(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    queuedMessageId: string,
  ): Promise<QueuedSessionMessageRecord> {
    const sessionId = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const [queuedMessage] = await selectableDatabase
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
          eq(sessionQueuedMessages.id, queuedMessageId),
        )) as QueuedMessageRow[];
      if (!queuedMessage) {
        throw new Error("Queued message not found.");
      }
      if (queuedMessage.status !== "pending") {
        throw new Error("Only pending queued messages can be steered.");
      }

      await updatableDatabase
        .update(sessionQueuedMessages)
        .set({
          shouldSteer: true,
          updatedAt: new Date(),
        })
        .where(and(
          eq(sessionQueuedMessages.companyId, companyId),
          eq(sessionQueuedMessages.id, queuedMessageId),
        ));

      return queuedMessage.sessionId;
    });

    const queuedMessages = await this.listPending(transactionProvider, companyId, sessionId);
    const queuedMessage = queuedMessages.find((currentQueuedMessage) => currentQueuedMessage.id === queuedMessageId);
    if (!queuedMessage) {
      throw new Error("Queued message not found.");
    }

    return queuedMessage;
  }

  async deletePendingUserMessage(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    queuedMessageId: string,
  ): Promise<QueuedSessionMessageRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const [queuedMessage] = await selectableDatabase
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
          eq(sessionQueuedMessages.id, queuedMessageId),
        )) as QueuedMessageRow[];
      if (!queuedMessage) {
        throw new Error("Queued message not found.");
      }
      if (queuedMessage.status !== "pending") {
        throw new Error("Only pending queued messages can be deleted.");
      }
      if (queuedMessage.shouldSteer) {
        throw new Error("Steer queued messages cannot be deleted.");
      }

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
          eq(sessionQueuedMessageImages.sessionQueuedMessageId, queuedMessageId),
        )) as QueuedMessageImageRow[];

      await deletableDatabase
        .delete(sessionQueuedMessages)
        .where(and(
          eq(sessionQueuedMessages.companyId, companyId),
          eq(sessionQueuedMessages.id, queuedMessageId),
        ));

      return {
        createdAt: queuedMessage.createdAt,
        id: queuedMessage.id,
        images: queuedMessageImages
          .filter((queuedMessageImage) => queuedMessageImage.sessionQueuedMessageId === queuedMessageId)
          .map((queuedMessageImage) => ({
            base64EncodedImage: queuedMessageImage.base64EncodedImage,
            id: queuedMessageImage.id,
            mimeType: queuedMessageImage.mimeType,
          })),
        sessionId: queuedMessage.sessionId,
        shouldSteer: queuedMessage.shouldSteer,
        status: queuedMessage.status,
        text: queuedMessage.text,
        updatedAt: queuedMessage.updatedAt,
      };
    });
  }

  async markPending(
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
          status: "pending",
          updatedAt: new Date(),
        })
        .where(and(
          eq(sessionQueuedMessages.companyId, companyId),
          inArray(sessionQueuedMessages.id, ids),
        ));
    });
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

  async deleteAllForSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<void> {
    await transactionProvider.transaction(async (tx) => {
      await this.deleteAllForSessionInTransaction(tx as DeletableDatabase, companyId, sessionId);
    });
  }

  async deleteAllForSessionInTransaction(
    deletableDatabase: DeletableDatabase,
    companyId: string,
    sessionId: string,
  ): Promise<void> {
    await deletableDatabase
      .delete(sessionQueuedMessages)
      .where(and(
        eq(sessionQueuedMessages.companyId, companyId),
        eq(sessionQueuedMessages.sessionId, sessionId),
      ));
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
    statuses: SessionQueuedMessageStatus[],
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
          inArray(sessionQueuedMessages.status, statuses),
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
