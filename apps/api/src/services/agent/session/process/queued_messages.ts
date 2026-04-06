import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import {
  sessionQueuedMessageStatusEnum,
  sessionQueuedMessageContents,
  sessionQueuedMessages,
} from "../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";

type SessionQueuedMessageStatus = (typeof sessionQueuedMessageStatusEnum.enumValues)[number];

type QueuedMessageRow = {
  claimedAt: Date | null;
  companyId: string;
  createdAt: Date;
  dispatchedAt: Date | null;
  id: string;
  sessionId: string;
  shouldSteer: boolean;
  status: SessionQueuedMessageStatus;
  updatedAt: Date;
};

type QueuedMessageContentRow = {
  arguments: unknown | null;
  companyId: string;
  createdAt: Date;
  data: string | null;
  id: string;
  mimeType: string | null;
  sessionQueuedMessageId: string;
  structuredContent: unknown | null;
  text: string | null;
  toolCallId: string | null;
  toolName: string | null;
  type: string;
  updatedAt: Date;
};

export type QueuedSessionMessageImageRecord = {
  base64EncodedImage: string;
  id: string;
  mimeType: string;
};

export type QueuedSessionMessageRecord = {
  claimedAt: Date | null;
  createdAt: Date;
  dispatchedAt: Date | null;
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
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): unknown;
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): unknown;
    };
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): unknown;
  };
};

type QueueWritableDatabase = SelectableDatabase & InsertableDatabase & UpdatableDatabase;

/**
 * Owns persistence of queued inbound session messages before a worker delivers them to PI Mono. Its
 * scope is limited to queue-state rows plus queued content parts, so the ingress queue mirrors the
 * transcript model instead of special-casing images outside the message body.
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
      return this.enqueueInTransaction(tx as unknown as QueueWritableDatabase, input);
    });
  }

  async enqueueInTransaction(
    database: QueueWritableDatabase,
    input: {
      companyId: string;
      images?: Array<{ base64EncodedImage: string; mimeType: string }>;
      sessionId: string;
      shouldSteer: boolean;
      text: string;
    },
  ): Promise<{ id: string }> {
    const timestamp = new Date();
    const latestQueuedMessage = await this.loadLatestQueuedMessage(
      database,
      input.companyId,
      input.sessionId,
    );
    if (latestQueuedMessage?.status === "pending" && latestQueuedMessage.shouldSteer === input.shouldSteer) {
      const contentRecords = this.buildContentRecords(latestQueuedMessage.id, input, timestamp);
      if (contentRecords.length > 0) {
        await database.insert(sessionQueuedMessageContents).values(contentRecords);
      }
      await database
        .update(sessionQueuedMessages)
        .set({
          updatedAt: timestamp,
        })
        .where(and(
          eq(sessionQueuedMessages.companyId, input.companyId),
          eq(sessionQueuedMessages.id, latestQueuedMessage.id),
        ));

      return {
        id: latestQueuedMessage.id,
      };
    }

    const queuedMessageId = crypto.randomUUID();
    await database.insert(sessionQueuedMessages).values({
      claimedAt: null,
      companyId: input.companyId,
      createdAt: timestamp,
      dispatchedAt: null,
      id: queuedMessageId,
      sessionId: input.sessionId,
      shouldSteer: input.shouldSteer,
      status: "pending",
      updatedAt: timestamp,
    });

    const contentRecords = this.buildContentRecords(queuedMessageId, input, timestamp);
    if (contentRecords.length > 0) {
      await database.insert(sessionQueuedMessageContents).values(contentRecords);
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

  async listQueued(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<QueuedSessionMessageRecord[]> {
    return this.listForFilter(transactionProvider, companyId, sessionId, ["pending", "processing"]);
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
      const queuedMessage = await this.loadQueuedMessage(selectableDatabase, companyId, queuedMessageId);
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
      const queuedMessage = await this.loadQueuedMessage(selectableDatabase, companyId, queuedMessageId);
      if (!queuedMessage) {
        throw new Error("Queued message not found.");
      }
      if (queuedMessage.status !== "pending") {
        throw new Error("Only pending queued messages can be deleted.");
      }
      if (queuedMessage.shouldSteer) {
        throw new Error("Steer queued messages cannot be deleted.");
      }

      const queuedMessageContents = await this.loadQueuedMessageContents(
        selectableDatabase,
        companyId,
        [queuedMessageId],
      );

      await deletableDatabase
        .delete(sessionQueuedMessages)
        .where(and(
          eq(sessionQueuedMessages.companyId, companyId),
          eq(sessionQueuedMessages.id, queuedMessageId),
        ));

      return this.serializeQueuedMessage(
        queuedMessage,
        queuedMessageContents.filter((content) => content.sessionQueuedMessageId === queuedMessageId),
      );
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
          claimedAt: null,
          dispatchedAt: null,
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
      const timestamp = new Date();
      await updatableDatabase
        .update(sessionQueuedMessages)
        .set({
          // `processing` means the worker has frozen this row's payload and is about to hand it to
          // PI Mono. The row is no longer batchable, but it is not "dispatched" yet because we
          // still have not observed the corresponding PI Mono user `message_start` event.
          claimedAt: timestamp,
          dispatchedAt: null,
          status: "processing",
          updatedAt: timestamp,
        })
        .where(and(
          eq(sessionQueuedMessages.companyId, companyId),
          inArray(sessionQueuedMessages.id, ids),
        ));
    });
  }

  async markDispatched(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    ids: string[],
    dispatchedAt: Date,
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(sessionQueuedMessages)
        .set({
          // `dispatchedAt` records the moment PI Mono actually starts the queued user message. That
          // is later than the worker's `steer()` / `prompt()` call and is our proof that the row
          // crossed from the Postgres queue into the live runtime event stream.
          dispatchedAt,
          updatedAt: dispatchedAt,
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
    // Only `pending` rows are wakeable work. `processing` rows were already claimed by a worker and
    // must not be replayed blindly; if they never dispatch, cleanup converts the safe subset back
    // to `pending` via `requeueUndispatchedProcessingSteer()`.
    const queuedMessages = await this.listPending(transactionProvider, companyId, sessionId);
    return queuedMessages.length > 0;
  }

  async requeueUndispatchedProcessingSteer(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<string[]> {
    const queuedMessages = await this.listQueued(transactionProvider, companyId, sessionId);
    const queuedMessageIds = queuedMessages
      // A steer row can be claimed locally, handed to `session.steer()`, and still never dispatch
      // if the runtime goes idle before PI Mono emits the user message. Those rows are safe to
      // requeue because `dispatchedAt = null` means no PI Mono user `message_start` was observed.
      .filter((queuedMessage) => queuedMessage.shouldSteer && queuedMessage.status === "processing" && !queuedMessage.dispatchedAt)
      .map((queuedMessage) => queuedMessage.id);
    if (queuedMessageIds.length === 0) {
      return [];
    }

    await this.markPending(transactionProvider, companyId, queuedMessageIds);
    return queuedMessageIds;
  }

  private buildContentRecords(
    queuedMessageId: string,
    input: {
      companyId: string;
      images?: Array<{ base64EncodedImage: string; mimeType: string }>;
      text: string;
    },
    timestamp: Date,
  ): Array<Record<string, unknown>> {
    const contentRecords: Array<Record<string, unknown>> = [];

    if (input.text.length > 0) {
      contentRecords.push({
        companyId: input.companyId,
        createdAt: timestamp,
        data: null,
        id: crypto.randomUUID(),
        mimeType: null,
        sessionQueuedMessageId: queuedMessageId,
        structuredContent: null,
        text: input.text,
        toolCallId: null,
        toolName: null,
        arguments: null,
        type: "text",
        updatedAt: timestamp,
      });
    }

    for (const image of input.images ?? []) {
      contentRecords.push({
        companyId: input.companyId,
        createdAt: timestamp,
        data: image.base64EncodedImage,
        id: crypto.randomUUID(),
        mimeType: image.mimeType,
        sessionQueuedMessageId: queuedMessageId,
        structuredContent: null,
        text: null,
        toolCallId: null,
        toolName: null,
        arguments: null,
        type: "image",
        updatedAt: timestamp,
      });
    }

    return contentRecords;
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
          claimedAt: sessionQueuedMessages.claimedAt,
          companyId: sessionQueuedMessages.companyId,
          createdAt: sessionQueuedMessages.createdAt,
          dispatchedAt: sessionQueuedMessages.dispatchedAt,
          id: sessionQueuedMessages.id,
          sessionId: sessionQueuedMessages.sessionId,
          shouldSteer: sessionQueuedMessages.shouldSteer,
          status: sessionQueuedMessages.status,
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

      const queuedMessageContents = await this.loadQueuedMessageContents(
        selectableDatabase,
        companyId,
        queuedMessages.map((queuedMessage) => queuedMessage.id),
      );
      const contentsByQueuedMessageId = this.groupContentsByQueuedMessageId(queuedMessageContents);

      return [...queuedMessages]
        .sort((leftMessage, rightMessage) => leftMessage.createdAt.getTime() - rightMessage.createdAt.getTime())
        .map((queuedMessage) => this.serializeQueuedMessage(
          queuedMessage,
          contentsByQueuedMessageId.get(queuedMessage.id) ?? [],
        ));
    });
  }

  private async loadQueuedMessage(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    queuedMessageId: string,
  ): Promise<QueuedMessageRow | null> {
    const [queuedMessage] = await selectableDatabase
      .select({
        claimedAt: sessionQueuedMessages.claimedAt,
        companyId: sessionQueuedMessages.companyId,
        createdAt: sessionQueuedMessages.createdAt,
        dispatchedAt: sessionQueuedMessages.dispatchedAt,
        id: sessionQueuedMessages.id,
        sessionId: sessionQueuedMessages.sessionId,
        shouldSteer: sessionQueuedMessages.shouldSteer,
        status: sessionQueuedMessages.status,
        updatedAt: sessionQueuedMessages.updatedAt,
      })
      .from(sessionQueuedMessages)
      .where(and(
        eq(sessionQueuedMessages.companyId, companyId),
        eq(sessionQueuedMessages.id, queuedMessageId),
      )) as QueuedMessageRow[];

    return queuedMessage ?? null;
  }

  private async loadLatestQueuedMessage(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    sessionId: string,
  ): Promise<QueuedMessageRow | null> {
    const queuedMessages = await selectableDatabase
      .select({
        claimedAt: sessionQueuedMessages.claimedAt,
        companyId: sessionQueuedMessages.companyId,
        createdAt: sessionQueuedMessages.createdAt,
        dispatchedAt: sessionQueuedMessages.dispatchedAt,
        id: sessionQueuedMessages.id,
        sessionId: sessionQueuedMessages.sessionId,
        shouldSteer: sessionQueuedMessages.shouldSteer,
        status: sessionQueuedMessages.status,
        updatedAt: sessionQueuedMessages.updatedAt,
      })
      .from(sessionQueuedMessages)
      .where(and(
        eq(sessionQueuedMessages.companyId, companyId),
        eq(sessionQueuedMessages.sessionId, sessionId),
      )) as QueuedMessageRow[];

    if (queuedMessages.length === 0) {
      return null;
    }

    return [...queuedMessages].sort((leftMessage, rightMessage) => {
      const updatedAtDelta = rightMessage.updatedAt.getTime() - leftMessage.updatedAt.getTime();
      if (updatedAtDelta !== 0) {
        return updatedAtDelta;
      }

      const createdAtDelta = rightMessage.createdAt.getTime() - leftMessage.createdAt.getTime();
      if (createdAtDelta !== 0) {
        return createdAtDelta;
      }

      return rightMessage.id.localeCompare(leftMessage.id);
    })[0] ?? null;
  }

  private async loadQueuedMessageContents(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    queuedMessageIds: string[],
  ): Promise<QueuedMessageContentRow[]> {
    if (queuedMessageIds.length === 0) {
      return [];
    }

    return await selectableDatabase
      .select({
        arguments: sessionQueuedMessageContents.arguments,
        companyId: sessionQueuedMessageContents.companyId,
        createdAt: sessionQueuedMessageContents.createdAt,
        data: sessionQueuedMessageContents.data,
        id: sessionQueuedMessageContents.id,
        mimeType: sessionQueuedMessageContents.mimeType,
        sessionQueuedMessageId: sessionQueuedMessageContents.sessionQueuedMessageId,
        structuredContent: sessionQueuedMessageContents.structuredContent,
        text: sessionQueuedMessageContents.text,
        toolCallId: sessionQueuedMessageContents.toolCallId,
        toolName: sessionQueuedMessageContents.toolName,
        type: sessionQueuedMessageContents.type,
        updatedAt: sessionQueuedMessageContents.updatedAt,
      })
      .from(sessionQueuedMessageContents)
      .where(and(
        eq(sessionQueuedMessageContents.companyId, companyId),
        inArray(sessionQueuedMessageContents.sessionQueuedMessageId, queuedMessageIds),
      )) as QueuedMessageContentRow[];
  }

  private groupContentsByQueuedMessageId(
    queuedMessageContents: QueuedMessageContentRow[],
  ): Map<string, QueuedMessageContentRow[]> {
    const contentsByQueuedMessageId = new Map<string, QueuedMessageContentRow[]>();

    for (const queuedMessageContent of queuedMessageContents) {
      const contents = contentsByQueuedMessageId.get(queuedMessageContent.sessionQueuedMessageId) ?? [];
      contents.push(queuedMessageContent);
      contentsByQueuedMessageId.set(queuedMessageContent.sessionQueuedMessageId, contents);
    }

    for (const [queuedMessageId, contents] of contentsByQueuedMessageId) {
      contentsByQueuedMessageId.set(queuedMessageId, [...contents].sort((leftContent, rightContent) => {
        const createdAtDelta = leftContent.createdAt.getTime() - rightContent.createdAt.getTime();
        if (createdAtDelta !== 0) {
          return createdAtDelta;
        }

        return leftContent.id.localeCompare(rightContent.id);
      }));
    }

    return contentsByQueuedMessageId;
  }

  private serializeQueuedMessage(
    queuedMessage: QueuedMessageRow,
    queuedMessageContents: QueuedMessageContentRow[],
  ): QueuedSessionMessageRecord {
    const textParts: string[] = [];
    const images: QueuedSessionMessageImageRecord[] = [];

    for (const queuedMessageContent of queuedMessageContents) {
      if (queuedMessageContent.type === "text" && queuedMessageContent.text) {
        textParts.push(queuedMessageContent.text);
        continue;
      }

      if (queuedMessageContent.type === "image" && queuedMessageContent.data && queuedMessageContent.mimeType) {
        images.push({
          base64EncodedImage: queuedMessageContent.data,
          id: queuedMessageContent.id,
          mimeType: queuedMessageContent.mimeType,
        });
      }
    }

    return {
      claimedAt: queuedMessage.claimedAt,
      createdAt: queuedMessage.createdAt,
      dispatchedAt: queuedMessage.dispatchedAt,
      id: queuedMessage.id,
      images,
      sessionId: queuedMessage.sessionId,
      shouldSteer: queuedMessage.shouldSteer,
      status: queuedMessage.status,
      text: textParts.join("\n\n"),
      updatedAt: queuedMessage.updatedAt,
    };
  }
}
