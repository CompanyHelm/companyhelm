import type { AgentInboxHumanQuestionRecord } from "../../inbox/service.ts";

/**
 * Keeps the ask-human-question tool output compact and predictable so the transcript can show a
 * succinct acknowledgement while the detailed proposals live in the inbox UI.
 */
export class AgentInboxResultFormatter {
  static formatCreateHumanQuestionResult(question: AgentInboxHumanQuestionRecord): string {
    return [
      `inboxItemId: ${question.id}`,
      `title: ${question.title}`,
      "status: open",
    ].join("\n");
  }
}
