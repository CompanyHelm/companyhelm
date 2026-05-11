import type { SessionMessageRecord } from "./chats_page_data";

export type HumanQuestionAnswerTranscriptDisplayRecord = {
  answerText: string;
  fullText: string;
  questionText: string;
};

/**
 * Parses the steer message created when a user resolves an ask_human_question prompt. The backend
 * stores that answer as a normal user prompt so the agent can resume, while the transcript should
 * present it as a compact decision record instead of a large user-authored chat bubble.
 */
export class HumanQuestionAnswerTranscriptPresenter {
  private static readonly HUMAN_ANSWER_PREFIX = "Human answered your question \"";

  static resolveDisplay(message: SessionMessageRecord): HumanQuestionAnswerTranscriptDisplayRecord | null {
    if (message.role !== "user" || message.principalType !== "user") {
      return null;
    }

    const text = message.text.trim();
    if (!text.startsWith(this.HUMAN_ANSWER_PREFIX)) {
      return null;
    }

    const remainingText = text.slice(this.HUMAN_ANSWER_PREFIX.length);
    const separatorIndex = remainingText.indexOf("\": ");
    if (separatorIndex < 0) {
      return null;
    }

    const questionText = remainingText.slice(0, separatorIndex).trim();
    const answerText = remainingText.slice(separatorIndex + "\": ".length).trim();
    if (questionText.length === 0 || answerText.length === 0) {
      return null;
    }

    return {
      answerText,
      fullText: text,
      questionText,
    };
  }
}
