import type { SessionMessageRecord } from "./chats_page_data";

export type AgentConversationTranscriptDisplayRecord = {
  fullText: string;
  previewText: string;
  sourceAgentName: string;
};

/**
 * Extracts the human-facing portions of the persisted agent-to-agent delivery prompt. The stored
 * text intentionally includes routing metadata for the receiving agent, while the transcript needs
 * a compact audit row that surfaces who sent the message and the first meaningful message line.
 */
export class AgentConversationTranscriptPresenter {
  static resolveDisplay(message: SessionMessageRecord): AgentConversationTranscriptDisplayRecord | null {
    if (message.role !== "user" || message.principalType !== "agent_message") {
      return null;
    }

    const templateLines = message.text.split(/\r?\n/u);
    const sourceAgentName = this.resolveSourceAgentName(templateLines);
    const fullText = this.resolveMessageText(templateLines, message.text);
    const previewText = this.resolvePreviewText(fullText);

    return {
      fullText,
      previewText,
      sourceAgentName,
    };
  }

  private static resolveSourceAgentName(lines: string[]): string {
    const sourceAgentLine = lines.find((line) => line.startsWith("Source agent name:"));
    const sourceAgentName = sourceAgentLine?.slice("Source agent name:".length).trim();
    return sourceAgentName && sourceAgentName.length > 0 ? sourceAgentName : "Agent";
  }

  private static resolveMessageText(lines: string[], fallbackText: string): string {
    const firstBodyLineIndex = lines.findIndex((line, lineIndex) => line.trim().length === 0 && lineIndex > 0);

    if (firstBodyLineIndex >= 0) {
      const bodyText = lines.slice(firstBodyLineIndex + 1).join("\n").trim();
      if (bodyText.length > 0) {
        return bodyText;
      }
    }

    return fallbackText.trim();
  }

  private static resolvePreviewText(fullText: string): string {
    const firstLine = fullText.split(/\r?\n/u).find((line) => line.trim().length > 0)?.trim();
    return firstLine && firstLine.length > 0 ? firstLine : "No message text.";
  }
}
