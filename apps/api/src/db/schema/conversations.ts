import { randomUUID } from "node:crypto";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { agents } from "./agents.ts";
import { companies } from "./company.ts";
import { agentSessions } from "./sessions.ts";

export const agentConversations = pgTable("agent_conversations", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("agent_conversations_company_id_idx").on(table.companyId),
}));

export const agentConversationParticipants = pgTable("agent_conversation_participants", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => agentConversations.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("agent_conversation_participants_company_id_idx").on(table.companyId),
  conversationIdIndex: index("agent_conversation_participants_conversation_id_idx").on(table.conversationId),
  sessionIdIndex: index("agent_conversation_participants_session_id_idx").on(table.sessionId),
  conversationSessionUnique: uniqueIndex("agent_conversation_participants_conversation_session_uidx").on(
    table.conversationId,
    table.sessionId,
  ),
}));

export const agentConversationMessages = pgTable("agent_conversation_messages", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  conversationId: uuid("conversation_id")
    .references(() => agentConversations.id, { onDelete: "cascade" })
    .notNull(),
  authorParticipantId: uuid("author_participant_id")
    .references(() => agentConversationParticipants.id, { onDelete: "cascade" })
    .notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("agent_conversation_messages_company_id_idx").on(table.companyId),
  conversationIdIndex: index("agent_conversation_messages_conversation_id_idx").on(table.conversationId),
  authorParticipantIdIndex: index("agent_conversation_messages_author_participant_id_idx").on(table.authorParticipantId),
}));
