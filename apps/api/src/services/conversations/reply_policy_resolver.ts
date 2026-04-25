export type AgentConversationReplyPolicy = "none" | "if_needed" | "required";

/**
 * Resolves the caller-provided reply policy into a canonical value so transport code can apply a
 * stable default even when the tool omits the field.
 */
export class AgentConversationReplyPolicyResolver {
  resolve(replyPolicy?: AgentConversationReplyPolicy | null): AgentConversationReplyPolicy {
    if (replyPolicy === "none" || replyPolicy === "required") {
      return replyPolicy;
    }

    return "if_needed";
  }
}
