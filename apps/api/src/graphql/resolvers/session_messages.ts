import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import { messageContents, sessionMessages } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type SessionMessageRecord = {
  id: string;
  sessionId: string;
  role: string;
  status: string;
  isError: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type MessageContentRecord = {
  messageId: string;
  text: string | null;
  type: string;
  createdAt: Date;
};

type GraphqlSessionMessageRecord = {
  id: string;
  sessionId: string;
  role: string;
  status: string;
  text: string;
  isError: boolean;
  createdAt: string;
  updatedAt: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Lists persisted transcript messages for the authenticated company. The resolver folds text
 * content blocks onto each message row so the chats page can render a transcript without knowing
 * about the lower-level `message_contents` table shape.
 */
@injectable()
export class SessionMessagesQueryResolver extends Resolver<GraphqlSessionMessageRecord[]> {
  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlSessionMessageRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const persistedMessages = await selectableDatabase
        .select({
          id: sessionMessages.id,
          sessionId: sessionMessages.sessionId,
          role: sessionMessages.role,
          status: sessionMessages.status,
          isError: sessionMessages.isError,
          createdAt: sessionMessages.createdAt,
          updatedAt: sessionMessages.updatedAt,
        })
        .from(sessionMessages)
        .where(eq(sessionMessages.companyId, context.authSession.company.id)) as SessionMessageRecord[];

      if (persistedMessages.length === 0) {
        return [];
      }

      const contents = await selectableDatabase
        .select({
          messageId: messageContents.messageId,
          text: messageContents.text,
          type: messageContents.type,
          createdAt: messageContents.createdAt,
        })
        .from(messageContents)
        .where(and(
          eq(messageContents.companyId, context.authSession.company.id),
          inArray(
            messageContents.messageId,
            persistedMessages.map((message) => message.id),
          ),
        )) as MessageContentRecord[];

      const textByMessageId = new Map<string, string>();
      const orderedContents = [...contents].sort((leftContent, rightContent) => {
        return leftContent.createdAt.getTime() - rightContent.createdAt.getTime();
      });
      for (const content of orderedContents) {
        if (content.type !== "text" || !content.text) {
          continue;
        }

        const existingText = textByMessageId.get(content.messageId) ?? "";
        textByMessageId.set(
          content.messageId,
          existingText.length > 0 ? `${existingText}\n${content.text}` : content.text,
        );
      }

      return [...persistedMessages]
        .sort((leftMessage, rightMessage) => leftMessage.createdAt.getTime() - rightMessage.createdAt.getTime())
        .map((message) => ({
          id: message.id,
          sessionId: message.sessionId,
          role: message.role,
          status: message.status,
          text: textByMessageId.get(message.id) ?? "",
          isError: message.isError,
          createdAt: message.createdAt.toISOString(),
          updatedAt: message.updatedAt.toISOString(),
        }));
    });
  };
}
