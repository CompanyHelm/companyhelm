import { readFileSync } from "node:fs";
import nunjucks from "nunjucks";

type AgentConversationMessageTemplateInput = {
  sourceAgentId: string;
  sourceAgentName: string;
  sourceSessionId: string;
  text: string;
};

/**
 * Renders the queued cross-agent delivery text that lands in the target session. The output keeps
 * the sender identity explicit and tells the receiving agent exactly which session id to use when
 * replying with the send_agent_message tool.
 */
export class AgentConversationMessageTemplate {
  private readonly templateSource = readFileSync(
    new URL("../templates/agent_conversation_message.njk", import.meta.url),
    "utf8",
  ).trim();

  render(input: AgentConversationMessageTemplateInput): string {
    return nunjucks.renderString(this.templateSource, input).trim();
  }
}
