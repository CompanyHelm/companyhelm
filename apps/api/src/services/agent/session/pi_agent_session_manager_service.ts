import { injectable } from "inversify";
import {
  type AgentSession,
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";

/**
 * Owns the in-memory lifecycle of PI SDK sessions for this process. Its scope is limited to
 * translating a CompanyHelm session id plus provider credentials into one live PI agent session
 * instance and keeping that mapping available while the API process is running.
 */
@injectable()
export class PiAgentSessionManagerService {
  private readonly sessionsById = new Map<string, AgentSession>();

  async create(sessionId: string, apiKey: string, providerId: string): Promise<AgentSession> {
    const existingSession = this.sessionsById.get(sessionId);
    if (existingSession) {
      existingSession.dispose();
    }

    const authStorage = AuthStorage.inMemory();
    authStorage.setRuntimeApiKey(providerId, apiKey);

    const sessionManager = SessionManager.inMemory();
    sessionManager.newSession({
      id: sessionId,
    });

    const { session } = await createAgentSession({
      authStorage,
      modelRegistry: new ModelRegistry(authStorage),
      sessionManager,
    });

    this.sessionsById.set(sessionId, session);
    return session;
  }

  get(sessionId: string): AgentSession | undefined {
    return this.sessionsById.get(sessionId);
  }
}
