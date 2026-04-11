import assert from "node:assert/strict";
import { test } from "vitest";
import { DeleteAgentConversationMutation } from "../src/graphql/mutations/delete_agent_conversation.ts";

test("DeleteAgentConversationMutation returns the deleted conversation id", async () => {
  const mutation = new DeleteAgentConversationMutation({
    async deleteConversation() {
      return {
        id: "conversation-1",
      };
    },
  } as never);

  const result = await mutation.execute(
    null,
    {
      input: {
        conversationId: "conversation-1",
      },
    },
    {
      authSession: {
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk",
          providerSubject: "user_clerk_123",
        },
        company: {
          id: "company-123",
          name: "Example Org",
        },
      },
      app_runtime_transaction_provider: {} as never,
    },
  );

  assert.deepEqual(result, {
    deletedConversationId: "conversation-1",
  });
});
