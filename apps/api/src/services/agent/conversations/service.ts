import { randomUUID } from "node:crypto";
import { and, eq, inArray, ne } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { type AppRuntimeTransaction, type TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import {
  agentConversationMessages,
  agentConversationParticipants,
  agentConversations,
  agentSessions,
  agents,
} from "../../../db/schema.ts";
import { ApiLogger } from "../../../log/api_logger.ts";
import { AgentConversationDeliveryPrompt } from "./delivery_prompt.ts";
import { SessionManagerService } from "../session/session_manager_service.ts";

export type AgentConversationSendMessageInput = {
  companyId: string;
  sourceAgentId: string;
  sourceSessionId: string;
  targetAgentId?: string | null;
  targetSessionId?: string | null;
  text: string;
};

export type AgentConversationSendMessageResult = {
  conversationId: string;
  createdNewTargetSession: boolean;
  messageId: string;
  targetAgentId: string;
  targetSessionId: string;
};

type AgentRow = {
  id: string;
  name: string;
};

type AgentConversationParticipantRow = {
  agentId: string;
  conversationId: string;
  id: string;
  sessionId: string;
};

type AgentConversationRow = {
  id: string;
  updatedAt: Date;
};

type SessionRow = {
  agentId: string;
  id: string;
  status: string;
};

type PlannedDelivery = {
  createdNewTargetSession: boolean;
  shouldSteerDelivery: boolean;
  targetAgentId: string;
  targetSessionId: string;
};

/**
 * Coordinates agent-to-agent messaging by binding one canonical conversation record to two agent
 * sessions and queueing the rendered delivery text into the target session. The canonical records
 * stay internal for now so the only public runtime surface can remain the send_agent_message tool.
 */
@injectable()
export class AgentConversationService {
  private readonly deliveryPrompt: AgentConversationDeliveryPrompt;
  private readonly logger: PinoLogger;
  private readonly sessionManagerService: SessionManagerService;

  constructor(
    @inject(ApiLogger) logger: ApiLogger,
    @inject(SessionManagerService) sessionManagerService: SessionManagerService,
  ) {
    this.deliveryPrompt = new AgentConversationDeliveryPrompt();
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
      const sourceSession = await this.loadSession(tx, input.companyId, input.sourceSessionId);
      if (sourceSession.agentId !== input.sourceAgentId) {
        throw new Error("Source session does not belong to the current agent.");
      }
      if (sourceSession.status === "archived") {
        throw new Error("Archived sessions cannot send agent messages.");
      }

      const sourceAgent = await this.loadAgent(tx, input.companyId, input.sourceAgentId);
      const delivery = await this.planDelivery(tx, input, sourceAgent);
      const persistedConversation = await this.resolveOrCreateConversation(
        tx,
        input.companyId,
        input.sourceAgentId,
        input.sourceSessionId,
        delivery.targetAgentId,
        delivery.targetSessionId,
      );
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

  private async planDelivery(
    tx: AppRuntimeTransaction,
    input: AgentConversationSendMessageInput,
    sourceAgent: AgentRow,
  ): Promise<PlannedDelivery> {
    const deliveryText = this.deliveryPrompt.format({
      sourceAgentId: input.sourceAgentId,
      sourceAgentName: sourceAgent.name,
      sourceSessionId: input.sourceSessionId,
      text: input.text,
    });

    if (input.targetSessionId) {
      if (input.targetSessionId === input.sourceSessionId) {
        throw new Error("Cannot send an agent message to the same session.");
      }

      const targetSession = await this.loadSession(tx, input.companyId, input.targetSessionId);
      if (targetSession.status === "archived") {
        throw new Error("Archived sessions cannot receive agent messages.");
      }

      await this.sessionManagerService.queuePromptInTransaction(
        tx,
        tx,
        tx,
        input.companyId,
        targetSession.id,
        deliveryText,
        {
          shouldSteer: true,
        },
      );

      return {
        createdNewTargetSession: false,
        shouldSteerDelivery: true,
        targetAgentId: targetSession.agentId,
        targetSessionId: targetSession.id,
      };
    }

    const targetAgentId = input.targetAgentId as string;
    await this.loadAgent(tx, input.companyId, targetAgentId);
    const reusableTarget = await this.findReusableTargetSession(
      tx,
      input.companyId,
      input.sourceSessionId,
      targetAgentId,
    );
    if (reusableTarget) {
      await this.sessionManagerService.queuePromptInTransaction(
        tx,
        tx,
        tx,
        input.companyId,
        reusableTarget.targetSessionId,
        deliveryText,
        {
          shouldSteer: true,
        },
      );

      return {
        createdNewTargetSession: false,
        shouldSteerDelivery: true,
        targetAgentId,
        targetSessionId: reusableTarget.targetSessionId,
      };
    }

    const createdSession = await this.sessionManagerService.createSessionInTransaction(
      tx,
      tx,
      input.companyId,
      targetAgentId,
      deliveryText,
    );

    return {
      createdNewTargetSession: true,
      shouldSteerDelivery: false,
      targetAgentId,
      targetSessionId: createdSession.id,
    };
  }

  private async resolveOrCreateConversation(
    tx: AppRuntimeTransaction,
    companyId: string,
    sourceAgentId: string,
    sourceSessionId: string,
    targetAgentId: string,
    targetSessionId: string,
  ): Promise<{ conversationId: string; sourceParticipantId: string }> {
    const existingConversation = await this.findConversationBySessions(
      tx,
      companyId,
      sourceSessionId,
      targetSessionId,
    );
    if (existingConversation) {
      return existingConversation;
    }

    const conversationId = randomUUID();
    const sourceParticipantId = randomUUID();
    const createdAt = new Date();
    await tx.insert(agentConversations).values({
      companyId,
      createdAt,
      id: conversationId,
      updatedAt: createdAt,
    });
    await tx.insert(agentConversationParticipants).values([
      {
        agentId: sourceAgentId,
        companyId,
        conversationId,
        createdAt,
        id: sourceParticipantId,
        sessionId: sourceSessionId,
      },
      {
        agentId: targetAgentId,
        companyId,
        conversationId,
        createdAt,
        id: randomUUID(),
        sessionId: targetSessionId,
      },
    ]);

    return {
      conversationId,
      sourceParticipantId,
    };
  }

  private async findConversationBySessions(
    tx: AppRuntimeTransaction,
    companyId: string,
    sourceSessionId: string,
    targetSessionId: string,
  ): Promise<{ conversationId: string; sourceParticipantId: string } | null> {
    const participantRows = await tx
      .select({
        agentId: agentConversationParticipants.agentId,
        conversationId: agentConversationParticipants.conversationId,
        id: agentConversationParticipants.id,
        sessionId: agentConversationParticipants.sessionId,
      })
      .from(agentConversationParticipants)
      .where(and(
        eq(agentConversationParticipants.companyId, companyId),
        inArray(agentConversationParticipants.sessionId, [sourceSessionId, targetSessionId]),
      )) as AgentConversationParticipantRow[];
    const conversationIds = [...new Set(
      participantRows
        .filter((participantRow) => participantRow.sessionId === sourceSessionId)
        .map((participantRow) => participantRow.conversationId),
    )];
    if (conversationIds.length === 0) {
      return null;
    }

    const candidateParticipantRows = participantRows.filter((participantRow) => {
      return conversationIds.includes(participantRow.conversationId);
    });
    const candidateConversationIds = [...new Set(
      candidateParticipantRows
        .filter((participantRow) => participantRow.sessionId === targetSessionId)
        .map((participantRow) => participantRow.conversationId),
    )];
    if (candidateConversationIds.length === 0) {
      return null;
    }

    const selectedConversation = await this.selectLatestConversation(tx, companyId, candidateConversationIds);
    if (!selectedConversation) {
      return null;
    }

    const sourceParticipant = candidateParticipantRows.find((participantRow) => {
      return participantRow.conversationId === selectedConversation.id && participantRow.sessionId === sourceSessionId;
    });
    if (!sourceParticipant) {
      return null;
    }

    return {
      conversationId: selectedConversation.id,
      sourceParticipantId: sourceParticipant.id,
    };
  }

  private async findReusableTargetSession(
    tx: AppRuntimeTransaction,
    companyId: string,
    sourceSessionId: string,
    targetAgentId: string,
  ): Promise<{ targetSessionId: string } | null> {
    const sourceParticipantRows = await tx
      .select({
        agentId: agentConversationParticipants.agentId,
        conversationId: agentConversationParticipants.conversationId,
        id: agentConversationParticipants.id,
        sessionId: agentConversationParticipants.sessionId,
      })
      .from(agentConversationParticipants)
      .where(and(
        eq(agentConversationParticipants.companyId, companyId),
        eq(agentConversationParticipants.sessionId, sourceSessionId),
      )) as AgentConversationParticipantRow[];
    if (sourceParticipantRows.length === 0) {
      return null;
    }

    const candidateConversationIds = sourceParticipantRows.map((participantRow) => participantRow.conversationId);
    const targetParticipantRows = await tx
      .select({
        agentId: agentConversationParticipants.agentId,
        conversationId: agentConversationParticipants.conversationId,
        id: agentConversationParticipants.id,
        sessionId: agentConversationParticipants.sessionId,
      })
      .from(agentConversationParticipants)
      .where(and(
        eq(agentConversationParticipants.companyId, companyId),
        inArray(agentConversationParticipants.conversationId, candidateConversationIds),
        eq(agentConversationParticipants.agentId, targetAgentId),
        ne(agentConversationParticipants.sessionId, sourceSessionId),
      )) as AgentConversationParticipantRow[];
    if (targetParticipantRows.length === 0) {
      return null;
    }

    const targetSessionRows = await tx
      .select({
        agentId: agentSessions.agentId,
        id: agentSessions.id,
        status: agentSessions.status,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        inArray(agentSessions.id, targetParticipantRows.map((participantRow) => participantRow.sessionId)),
      )) as SessionRow[];
    const activeTargetParticipants = targetParticipantRows.filter((participantRow) => {
      return targetSessionRows.some((sessionRow) => {
        return sessionRow.id === participantRow.sessionId && sessionRow.status !== "archived";
      });
    });
    if (activeTargetParticipants.length !== 1) {
      return null;
    }

    return {
      targetSessionId: activeTargetParticipants[0]?.sessionId as string,
    };
  }

  private async selectLatestConversation(
    tx: AppRuntimeTransaction,
    companyId: string,
    conversationIds: string[],
  ): Promise<AgentConversationRow | null> {
    const conversationRows = await tx
      .select({
        id: agentConversations.id,
        updatedAt: agentConversations.updatedAt,
      })
      .from(agentConversations)
      .where(and(
        eq(agentConversations.companyId, companyId),
        inArray(agentConversations.id, conversationIds),
      )) as AgentConversationRow[];
    if (conversationRows.length === 0) {
      return null;
    }

    conversationRows.sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
    return conversationRows[0] ?? null;
  }

  private async loadAgent(
    tx: AppRuntimeTransaction,
    companyId: string,
    agentId: string,
  ): Promise<AgentRow> {
    const [agentRow] = await tx
      .select({
        id: agents.id,
        name: agents.name,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        eq(agents.id, agentId),
      )) as AgentRow[];
    if (!agentRow) {
      throw new Error("Agent not found.");
    }

    return agentRow;
  }

  private async loadSession(
    tx: AppRuntimeTransaction,
    companyId: string,
    sessionId: string,
  ): Promise<SessionRow> {
    const [sessionRow] = await tx
      .select({
        agentId: agentSessions.agentId,
        id: agentSessions.id,
        status: agentSessions.status,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        eq(agentSessions.id, sessionId),
      )) as SessionRow[];
    if (!sessionRow) {
      throw new Error("Session not found.");
    }

    return sessionRow;
  }
}
