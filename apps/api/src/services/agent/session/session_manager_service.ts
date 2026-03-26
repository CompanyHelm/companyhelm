import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import { ApiLogger } from "../../../log/api_logger.ts";
import { agents, agentSessions, modelProviderCredentialModels, modelProviderCredentials } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { RedisCompanyScopedService } from "../../redis/company_scoped_service.ts";
import { RedisService } from "../../redis/service.ts";
import { PiMonoSessionManagerService } from "./pi-mono/session_manager_service.ts";

type AgentRecord = {
  id: string;
  defaultModelProviderCredentialModelId: string | null;
  defaultReasoningLevel: string | null;
};

type ModelRecord = {
  id: string;
  modelId: string;
  modelProviderCredentialId: string;
};

type CredentialRecord = {
  id: string;
  modelProvider: string;
  encryptedApiKey: string;
};

type SessionRecord = {
  id: string;
  agentId: string;
  currentModelId: string;
  currentReasoningLevel: string;
  status: string;
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

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): {
        returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
      };
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
  private readonly piMonoSessionManagerService: PiMonoSessionManagerService;
  private readonly redisService: RedisService;

  constructor(
    @inject(ApiLogger) logger: ApiLogger,
    @inject(PiMonoSessionManagerService) piMonoSessionManagerService: PiMonoSessionManagerService,
    @inject(RedisService) redisService: RedisService,
  ) {
    this.logger = logger.child({
      component: "session_manager_service",
    });
    this.piMonoSessionManagerService = piMonoSessionManagerService;
    this.redisService = redisService;
  }

  async createSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    userMessage: string,
    modelId?: string | null,
    reasoningLevel?: string | null,
    sessionId?: string | null,
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

      const defaultModelRecord = await this.resolveDefaultModelRecord(
        selectableDatabase,
        companyId,
        agentRecord,
      );
      const resolvedModelId = this.resolveModelId(defaultModelRecord, modelId);
      const resolvedReasoningLevel = this.resolveReasoningLevel(agentRecord, reasoningLevel);
      const credentialRecord = await this.resolveCredentialRecord(
        selectableDatabase,
        companyId,
        defaultModelRecord.modelProviderCredentialId,
      );
      const resolvedSessionId = String(sessionId || "").trim();
      const now = new Date();
      const [sessionRecord] = await insertableDatabase
        .insert(agentSessions)
        .values({
          ...(resolvedSessionId.length > 0 ? { id: resolvedSessionId } : {}),
          companyId,
          agentId,
          currentModelId: resolvedModelId,
          currentReasoningLevel: resolvedReasoningLevel,
          status: "running",
          created_at: now,
          updated_at: now,
        })
        .returning?.({
          id: agentSessions.id,
          agentId: agentSessions.agentId,
          currentModelId: agentSessions.currentModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
          status: agentSessions.status,
          createdAt: agentSessions.created_at,
          updatedAt: agentSessions.updated_at,
        }) as SessionRecord[];
      if (!sessionRecord) {
        throw new Error("Failed to create session.");
      }

      await this.piMonoSessionManagerService.create(
        transactionProvider,
        sessionRecord.id,
        credentialRecord.encryptedApiKey,
        credentialRecord.modelProvider,
        resolvedModelId,
        resolvedReasoningLevel,
      );
      await this.piMonoSessionManagerService.prompt(sessionRecord.id, userMessage);
      await this.publishSessionUpdate(companyId, sessionRecord.id);

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

  async archiveSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<SessionRecord> {
    const sessionRecord = await transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      const now = new Date();
      const [sessionRecord] = await updatableDatabase
        .update(agentSessions)
        .set({
          status: "archived",
          updated_at: now,
        })
        .where(and(
          eq(agentSessions.companyId, companyId),
          eq(agentSessions.id, sessionId),
        ))
        .returning?.({
          id: agentSessions.id,
          agentId: agentSessions.agentId,
          currentModelId: agentSessions.currentModelId,
          currentReasoningLevel: agentSessions.currentReasoningLevel,
          status: agentSessions.status,
          createdAt: agentSessions.created_at,
          updatedAt: agentSessions.updated_at,
        }) as SessionRecord[];

      if (!sessionRecord) {
        throw new Error("Session not found.");
      }

      await this.publishSessionUpdate(companyId, sessionRecord.id);

      this.logger.info({
        companyId,
        sessionId,
      }, "archived agent session");

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

  private async resolveDefaultModelRecord(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    agentRecord: AgentRecord,
  ): Promise<ModelRecord> {
    if (!agentRecord.defaultModelProviderCredentialModelId) {
      throw new Error("Agent default model is required.");
    }

    const [modelRecord] = await selectableDatabase
      .select({
        id: modelProviderCredentialModels.id,
        modelId: modelProviderCredentialModels.modelId,
        modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.id, agentRecord.defaultModelProviderCredentialModelId),
      )) as ModelRecord[];
    if (!modelRecord) {
      throw new Error("Agent default model not found.");
    }

    return modelRecord;
  }

  private resolveModelId(defaultModelRecord: ModelRecord, modelId?: string | null): string {
    if (modelId) {
      return modelId;
    }

    return defaultModelRecord.modelId;
  }

  private async resolveCredentialRecord(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    modelProviderCredentialId: string,
  ): Promise<CredentialRecord> {
    const [credentialRecord] = await selectableDatabase
      .select({
        id: modelProviderCredentials.id,
        modelProvider: modelProviderCredentials.modelProvider,
        encryptedApiKey: modelProviderCredentials.encryptedApiKey,
      })
      .from(modelProviderCredentials)
      .where(and(
        eq(modelProviderCredentials.companyId, companyId),
        eq(modelProviderCredentials.id, modelProviderCredentialId),
      )) as CredentialRecord[];
    if (!credentialRecord) {
      throw new Error("Agent model provider credential not found.");
    }

    return credentialRecord;
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

  private async publishSessionUpdate(companyId: string, sessionId: string): Promise<void> {
    const redisCompanyScopedService = new RedisCompanyScopedService(companyId, this.redisService);
    await redisCompanyScopedService.publish(`session:${sessionId}:update`);
  }
}
