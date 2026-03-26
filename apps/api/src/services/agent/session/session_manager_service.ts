import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { ApiLogger } from "../../../log/api_logger.ts";
import { agents, agentSessions, modelProviderCredentialModels } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";

type AgentRecord = {
  id: string;
  defaultModelProviderCredentialModelId: string | null;
  defaultReasoningLevel: string | null;
};

type ModelRecord = {
  id: string;
  modelId: string;
};

type SessionRecord = {
  id: string;
  agentId: string;
  currentModelId: string;
  currentReasoningLevel: string;
  userMessage: string;
  createdAt: Date;
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
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Owns persisted agent-session creation for the CompanyHelm domain. Its scope is deciding which
 * agent defaults become part of a new session record, storing that session in the company-scoped
 * database, and exposing the entry point that later runtime execution can build on.
 */
@injectable()
export class SessionManagerService {
  private readonly logger: PinoLogger;

  constructor(@inject(ApiLogger) logger: ApiLogger) {
    this.logger = logger.child({
      component: "session_manager_service",
    });
  }

  async createSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    userMessage: string,
    modelId?: string | null,
    reasoningLevel?: string | null,
  ): Promise<SessionRecord> {
    const sessionRecord = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const [agentRecord] = await selectableDatabase
        .select({
          id: agents.id,
          defaultModelProviderCredentialModelId: agents.defaultModelProviderCredentialModelId,
          defaultReasoningLevel: agents.default_reasoning_level,
        })
        .from(agents)
        .where(and(
          eq(agents.companyId, companyId),
          eq(agents.id, agentId),
        )) as AgentRecord[];
      if (!agentRecord) {
        throw new Error("Agent not found.");
      }

      const resolvedModelId = await this.resolveModelId(
        selectableDatabase,
        companyId,
        agentRecord,
        modelId,
      );
      const resolvedReasoningLevel = this.resolveReasoningLevel(agentRecord, reasoningLevel);
      const now = new Date();
      const [sessionRecord] = await insertableDatabase
        .insert(agentSessions)
        .values({
          companyId,
          agentId,
          currentModelId: resolvedModelId,
          currentReasoningLevel: resolvedReasoningLevel,
          user_message: userMessage,
          created_at: now,
          updated_at: now,
        })
        .returning?.({
          id: agentSessions.id,
          agentId: agentSessions.agentId,
          currentModelId: agentSessions.currentModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
          userMessage: agentSessions.user_message,
          createdAt: agentSessions.created_at,
          updatedAt: agentSessions.updated_at,
        }) as SessionRecord[];
      if (!sessionRecord) {
        throw new Error("Failed to create session.");
      }

      this.logger.info({
        agentId,
        companyId,
        modelId: resolvedModelId,
        reasoningLevel: resolvedReasoningLevel,
        sessionId: sessionRecord.id,
      }, "created agent session");

      return sessionRecord;
    });

    return sessionRecord;
  }

  async prompt(
    _transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<void> {
    this.logger.info({
      companyId,
      sessionId,
    }, "prompt requested for agent session");
  }

  private async resolveModelId(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    agentRecord: AgentRecord,
    modelId?: string | null,
  ): Promise<string> {
    if (modelId) {
      return modelId;
    }
    if (!agentRecord.defaultModelProviderCredentialModelId) {
      throw new Error("Agent default model is required.");
    }

    const [modelRecord] = await selectableDatabase
      .select({
        id: modelProviderCredentialModels.id,
        modelId: modelProviderCredentialModels.modelId,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.id, agentRecord.defaultModelProviderCredentialModelId),
      )) as ModelRecord[];
    if (!modelRecord) {
      throw new Error("Agent default model not found.");
    }

    return modelRecord.modelId;
  }

  private resolveReasoningLevel(
    agentRecord: AgentRecord,
    reasoningLevel?: string | null,
  ): string {
    if (reasoningLevel) {
      return reasoningLevel;
    }

    return agentRecord.defaultReasoningLevel ?? "";
  }
}
