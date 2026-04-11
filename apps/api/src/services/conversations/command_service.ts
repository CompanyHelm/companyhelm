import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Logger as PinoLogger } from "pino";
import { type AppRuntimeTransaction, type TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { agentConversationMessages, agentConversations } from "../../db/schema.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import { SessionManagerService } from "../agent/session/session_manager_service.ts";
import {
  ConversationDeliveryPlanner,
  type ConversationDeliveryPlan,
  type ConversationResolution,
} from "./delivery_planner.ts";
import type {
  AgentConversationDeleteInput,
  AgentConversationSendMessageInput,
  AgentConversationSendMessageResult,
} from "./service.ts";

/**
 * Owns write-side conversation operations so send, delete, and persistence orchestration can
 * evolve separately from read-side hydration without re-expanding the public facade service.
 */
export class AgentConversationCommandService {
  private readonly deliveryPlanner: ConversationDeliveryPlanner;
  private readonly logger: PinoLogger;
  private readonly sessionManagerService: SessionManagerService;

  constructor(
    logger: ApiLogger,
    sessionManagerService: SessionManagerService,
    deliveryPlanner: ConversationDeliveryPlanner,
  ) {
    this.deliveryPlanner = deliveryPlanner;
    this.logger = logger.child({
      component: "agent_conversation_service",
    });
    this.sessionManagerService = sessionManagerService;
  }

  async sendMessage(
    transactionProvider: TransactionProviderInterface,
    input: AgentConversationSendMessageInput,
  ): Promise<AgentConversationSendMessageResult> {
    this.validateInput(input);

    const persistedMessage = await transactionProvider.transaction(async (tx) => {
      const sourceSession = await this.deliveryPlanner.loadSession(tx, input.companyId, input.sourceSessionId);
      if (sourceSession.agentId !== input.sourceAgentId) {
        throw new Error("Source session does not belong to the current agent.");
      }
      if (sourceSession.status === "archived") {
        throw new Error("Archived sessions cannot send agent messages.");
      }

      const sourceAgent = await this.deliveryPlanner.loadAgent(tx, input.companyId, input.sourceAgentId);
      const delivery = await this.deliveryPlanner.planDelivery(tx, input, sourceAgent);
      const persistedConversation = await this.deliveryPlanner.resolveOrCreateConversation(
        tx,
        input.companyId,
        input.sourceAgentId,
        input.sourceSessionId,
        delivery.targetAgentId,
        delivery.targetSessionId,
      );
      return this.persistMessage(tx, input, delivery, persistedConversation);
    });

    await this.sessionManagerService.notifyQueuedSessionMessage(
      input.companyId,
      persistedMessage.targetSessionId,
      persistedMessage.shouldSteerDelivery,
    );

    this.logger.info({
      companyId: input.companyId,
      conversationId: persistedMessage.conversationId,
      messageId: persistedMessage.messageId,
      sourceAgentId: input.sourceAgentId,
      sourceSessionId: input.sourceSessionId,
      targetAgentId: persistedMessage.targetAgentId,
      targetSessionId: persistedMessage.targetSessionId,
    }, "sent agent conversation message");

    return {
      conversationId: persistedMessage.conversationId,
      createdNewTargetSession: persistedMessage.createdNewTargetSession,
      messageId: persistedMessage.messageId,
      targetAgentId: persistedMessage.targetAgentId,
      targetSessionId: persistedMessage.targetSessionId,
    };
  }

  async deleteConversation(
    transactionProvider: TransactionProviderInterface,
    input: AgentConversationDeleteInput,
  ): Promise<{ id: string }> {
    return transactionProvider.transaction(async (tx) => {
      const conversation = await this.loadConversation(tx, input.companyId, input.conversationId);

      await tx
        .delete(agentConversations)
        .where(and(
          eq(agentConversations.companyId, input.companyId),
          eq(agentConversations.id, input.conversationId),
        ));

      this.logger.info({
        companyId: input.companyId,
        conversationId: input.conversationId,
      }, "deleted agent conversation");

      return {
        id: conversation.id,
      };
    });
  }

  private async persistMessage(
    tx: AppRuntimeTransaction,
    input: AgentConversationSendMessageInput,
    delivery: ConversationDeliveryPlan,
    persistedConversation: ConversationResolution,
  ): Promise<AgentConversationSendMessageResult & { shouldSteerDelivery: boolean }> {
    const createdAt = new Date();
    const messageId = randomUUID();
    await tx.insert(agentConversationMessages).values({
      authorParticipantId: persistedConversation.sourceParticipantId,
      companyId: input.companyId,
      conversationId: persistedConversation.conversationId,
      createdAt,
      id: messageId,
      text: input.text,
    });
    await tx
      .update(agentConversations)
      .set({
        updatedAt: createdAt,
      })
      .where(and(
        eq(agentConversations.companyId, input.companyId),
        eq(agentConversations.id, persistedConversation.conversationId),
      ));

    return {
      conversationId: persistedConversation.conversationId,
      createdNewTargetSession: delivery.createdNewTargetSession,
      messageId,
      shouldSteerDelivery: delivery.shouldSteerDelivery,
      targetAgentId: delivery.targetAgentId,
      targetSessionId: delivery.targetSessionId,
    };
  }

  private validateInput(input: AgentConversationSendMessageInput): void {
    if (!/\S/.test(input.text)) {
      throw new Error("text is required.");
    }

    const targetCount = [input.targetAgentId, input.targetSessionId]
      .filter((value) => String(value ?? "").trim().length > 0)
      .length;
    if (targetCount !== 1) {
      throw new Error("Exactly one of targetAgentId or targetSessionId is required.");
    }
  }

  private async loadConversation(
    tx: AppRuntimeTransaction,
    companyId: string,
    conversationId: string,
  ): Promise<{ id: string }> {
    const [conversationRow] = await tx
      .select({
        id: agentConversations.id,
      })
      .from(agentConversations)
      .where(and(
        eq(agentConversations.companyId, companyId),
        eq(agentConversations.id, conversationId),
      )) as Array<{ id: string }>;
    if (!conversationRow) {
      throw new Error("Conversation not found.");
    }

    return conversationRow;
  }
}
