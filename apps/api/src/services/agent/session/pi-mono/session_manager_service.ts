import { inject, injectable } from "inversify";
import type { ThinkingLevel } from "@mariozechner/pi-agent-core";
import {
  type AgentSession,
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { RedisService } from "../../../redis/service.ts";
import { PiMonoSessionEventHandler } from "./session_event_handler.ts";

/**
 * Owns the in-memory lifecycle of PI Mono SDK sessions for this process. Its scope is limited to
 * turning one CompanyHelm session id plus provider credentials into one live PI Mono session and
 * keeping that session reachable while the API process is running.
 */
@injectable()
export class PiMonoSessionManagerService {
  private readonly sessionsById = new Map<string, AgentSession>();
  private readonly redisService: RedisService;

  constructor(@inject(RedisService) redisService: RedisService) {
    this.redisService = redisService;
  }

  async create(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    apiKey: string,
    providerId: string,
    modelId: string,
    reasoningLevel?: string | null,
  ): Promise<AgentSession> {
    const existingSession = this.sessionsById.get(sessionId);
    if (existingSession) {
      existingSession.dispose();
    }

    const authStorage = AuthStorage.inMemory();
    authStorage.setRuntimeApiKey(providerId, apiKey);
    const modelRegistry = new ModelRegistry(authStorage);
    const model = modelRegistry.find(providerId, modelId);
    if (!model) {
      throw new Error(`Model not found for provider "${providerId}": ${modelId}`);
    }

    const sessionManager = SessionManager.inMemory();
    sessionManager.newSession({
      id: sessionId,
    });

    const { session } = await createAgentSession({
      authStorage,
      modelRegistry,
      sessionManager,
      model,
      thinkingLevel: this.resolveThinkingLevel(reasoningLevel),
    });
    const sessionEventHandler = new PiMonoSessionEventHandler(
      transactionProvider,
      sessionId,
      this.redisService,
    );

    session.subscribe((event) => {
      void sessionEventHandler.handle(event);
    });

    this.sessionsById.set(sessionId, session);
    return session;
  }

  private resolveThinkingLevel(reasoningLevel?: string | null): ThinkingLevel | undefined {
    if (!reasoningLevel) {
      return undefined;
    }

    return reasoningLevel as ThinkingLevel;
  }

  async prompt(sessionId: string, message: string): Promise<void> {
    const session = this.get(sessionId);
    if (!session) {
      throw new Error("Session not found.");
    }
    session.prompt(message);
  }

  get(sessionId: string): AgentSession | undefined {
    return this.sessionsById.get(sessionId);
  }
}
