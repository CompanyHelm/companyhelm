/**
 * Carries the session-scoped identity metadata injected into the CompanyHelm system prompt so the
 * runtime can accurately refer to itself without relying on tool output or inferred state.
 */
export class SystemPromptTemplateContext {
  readonly agentId: string;
  readonly agentName: string;
  readonly companyName: string;
  readonly sessionId: string;
  readonly userFirstName: string | null;

  constructor(agentId: string, agentName: string, companyName: string, sessionId: string, userFirstName: string | null) {
    this.agentId = agentId;
    this.agentName = agentName;
    this.companyName = companyName;
    this.sessionId = sessionId;
    this.userFirstName = userFirstName;
  }
}
