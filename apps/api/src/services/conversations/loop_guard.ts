type AgentConversationRecentMessage = {
  authorSessionId: string;
  text: string;
};

/**
 * Detects acknowledgment ping-pong loops in two-party agent conversations. The guard is purposely
 * narrow: it only blocks a new send when the other side just sent a low-information closure message
 * and this same session already sent a similarly low-information closure message immediately before
 * that. This preserves substantive follow-ups while cutting off infinite "thanks / acknowledged"
 * exchanges.
 */
export class AgentConversationLoopGuard {
  shouldBlockLowInformationReply(
    sourceSessionId: string,
    currentText: string,
    recentMessages: AgentConversationRecentMessage[],
  ): boolean {
    const [latestMessage] = recentMessages;
    if (!latestMessage) {
      return false;
    }
    if (latestMessage.authorSessionId === sourceSessionId) {
      return false;
    }
    if (!this.isLowInformationClosure(currentText)) {
      return false;
    }
    if (!this.isLowInformationClosure(latestMessage.text)) {
      return false;
    }

    const latestPriorFromSameSession = recentMessages.find((message) => {
      return message.authorSessionId === sourceSessionId;
    });
    if (!latestPriorFromSameSession) {
      return false;
    }

    return this.isLowInformationClosure(latestPriorFromSameSession.text);
  }

  private isLowInformationClosure(text: string): boolean {
    const compactText = text.trim();
    if (compactText.length === 0 || compactText.length > 220) {
      return false;
    }
    if (compactText.includes("?") || compactText.includes("http://") || compactText.includes("https://")) {
      return false;
    }

    const normalizedText = compactText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const closurePhrases = [
      "thanks",
      "thank you",
      "appreciated",
      "appreciate it",
      "acknowledged",
      "understood",
      "sounds good",
      "got it",
      "will do",
      "happy to help",
      "feel free to loop me in",
      "loop me in",
      "reach out",
      "ping me",
      "ready whenever",
      "anytime",
      "i ll be ready",
      "i ll be here",
    ];

    return closurePhrases.some((phrase) => normalizedText.includes(phrase));
  }
}
