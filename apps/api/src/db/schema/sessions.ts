import { randomUUID } from "node:crypto";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

import { agents, modelProviderCredentialModels } from "./agents.ts";
import { companySecrets, companies, users } from "./company.ts";

export const sessionMessageRoleEnum = pgEnum("session_message_role", ["user", "assistant", "toolResult"]);
export const messageContentTypeEnum = pgEnum("message_content_type", ["text", "image", "toolCall", "thinking"]);
export const agentSessionStatusEnum = pgEnum("agent_session_status", ["queued", "running", "stopped", "archived"]);
export const sessionMessageStatusEnum = pgEnum("session_message_status", ["running", "completed"]);
export const llmUsageAggregateScopeEnum = pgEnum("llm_usage_aggregate_scope", ["company", "agent", "session"]);
export const llmUsageAggregatePeriodEnum = pgEnum("llm_usage_aggregate_period", ["total", "day", "month"]);
// it will be deleted on completion of the message, so no completed or failed statuses
// processing means the message got sent to the session using the session SDK e.g. pi mono
export const sessionQueuedMessageStatusEnum = pgEnum("session_queued_message_status", ["pending", "processing"]);
export const agentInboxKindEnum = pgEnum("agent_inbox_kind", ["human_question"]);
export const agentInboxStatusEnum = pgEnum("agent_inbox_status", ["open", "resolved"]);

export const agentSessions = pgTable("agent_sessions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  currentModelProviderCredentialModelId: uuid("current_model_provider_credential_model_id")
    .references(() => modelProviderCredentialModels.id, { onDelete: "set null" })
    .notNull(),
  // inferred from first message or based on LLM generated title
  inferredTitle: text("inferred_title"),
  // owner of a user-initiated chat, optional when the session was created by the system
  ownerUserId: uuid("owner_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  // user explicitly set title, it should take precedence over the inferred title
  userSetTitle: text("user_set_title"),
  currentReasoningLevel: text("current_reasoning_level").notNull(),
  status: agentSessionStatusEnum("status").notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  forkedFromTurnId: uuid("forked_from_turn_id")
    .references((): AnyPgColumn => sessionTurns.id, { onDelete: "set null" }),
  // the latest persisted runtime context from pi mono session.agent.state.messages.
  // It is used to reload the live session state after worker restarts without replaying the full
  // transcript.
  contextMessagesSnapshot: jsonb("context_messages_snapshot"),
  contextMessagesSnapshotAt: timestamp("context_messages_snapshot_at", { withTimezone: true }),
  isThinking: boolean("is_thinking").notNull(),
  thinkingText: text("thinking_text"),
  currentContextTokens: integer("current_context_tokens"),
  maxContextTokens: integer("max_context_tokens"),
  lastUserMessageAt: timestamp("last_user_message_at", { withTimezone: true }),
  isCompacting: boolean("is_compacting").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("agent_sessions_company_id_idx").on(table.companyId),
  companyLastUserMessageAtIndex: index("agent_sessions_company_last_user_message_at_idx").on(table.companyId, table.lastUserMessageAt),
}));

export const sessionTurns = pgTable("session_turns", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references((): AnyPgColumn => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  usageInputTokens: integer("usage_input_tokens").default(0).notNull(),
  usageOutputTokens: integer("usage_output_tokens").default(0).notNull(),
  usageCacheReadTokens: integer("usage_cache_read_tokens").default(0).notNull(),
  usageCacheWriteTokens: integer("usage_cache_write_tokens").default(0).notNull(),
  usageTotalTokens: integer("usage_total_tokens").default(0).notNull(),
  usageInputCostNanoUsd: bigint("usage_input_cost_nano_usd", { mode: "number" }).default(0).notNull(),
  usageOutputCostNanoUsd: bigint("usage_output_cost_nano_usd", { mode: "number" }).default(0).notNull(),
  usageCacheReadCostNanoUsd: bigint("usage_cache_read_cost_nano_usd", { mode: "number" }).default(0).notNull(),
  usageCacheWriteCostNanoUsd: bigint("usage_cache_write_cost_nano_usd", { mode: "number" }).default(0).notNull(),
  usageTotalCostNanoUsd: bigint("usage_total_cost_nano_usd", { mode: "number" }).default(0).notNull(),
  usageRecordedAt: timestamp("usage_recorded_at", { withTimezone: true }),
}, (table) => ({
  companyIdIndex: index("session_turns_company_id_idx").on(table.companyId),
  sessionIdIndex: index("session_turns_session_id_idx").on(table.sessionId),
  sessionStartedAtIndex: index("session_turns_session_started_at_idx").on(table.sessionId, table.startedAt),
}));

export const llmUsageAggregates = pgTable("llm_usage_aggregates", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  scopeType: llmUsageAggregateScopeEnum("scope_type").notNull(),
  scopeId: uuid("scope_id").notNull(),
  period: llmUsageAggregatePeriodEnum("period").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  requestCount: bigint("request_count", { mode: "number" }).default(0).notNull(),
  inputTokens: bigint("input_tokens", { mode: "number" }).default(0).notNull(),
  outputTokens: bigint("output_tokens", { mode: "number" }).default(0).notNull(),
  cacheReadTokens: bigint("cache_read_tokens", { mode: "number" }).default(0).notNull(),
  cacheWriteTokens: bigint("cache_write_tokens", { mode: "number" }).default(0).notNull(),
  totalTokens: bigint("total_tokens", { mode: "number" }).default(0).notNull(),
  inputCostNanoUsd: bigint("input_cost_nano_usd", { mode: "number" }).default(0).notNull(),
  outputCostNanoUsd: bigint("output_cost_nano_usd", { mode: "number" }).default(0).notNull(),
  cacheReadCostNanoUsd: bigint("cache_read_cost_nano_usd", { mode: "number" }).default(0).notNull(),
  cacheWriteCostNanoUsd: bigint("cache_write_cost_nano_usd", { mode: "number" }).default(0).notNull(),
  totalCostNanoUsd: bigint("total_cost_nano_usd", { mode: "number" }).default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyScopeIndex: index("llm_usage_aggregates_company_scope_idx")
    .on(table.companyId, table.scopeType, table.scopeId),
  companyScopePeriodUnique: uniqueIndex("llm_usage_aggregates_company_scope_period_uidx")
    .on(table.companyId, table.scopeType, table.scopeId, table.period, table.periodStart),
}));

export const userSessionReads = pgTable("user_session_reads", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.companyId, table.userId, table.sessionId] }),
  companyUserIdIndex: index("user_session_reads_company_user_id_idx").on(table.companyId, table.userId),
  sessionIdIndex: index("user_session_reads_session_id_idx").on(table.sessionId),
}));

export const sessionTools = pgTable("session_tools", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentSessionId: uuid("agent_session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("session_tools_company_id_idx").on(table.companyId),
  agentSessionIdIndex: index("session_tools_agent_session_id_idx").on(table.agentSessionId),
  nameIndex: index("session_tools_name_idx").on(table.name),
}));

export const sessionMessages = pgTable("session_messages", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  turnId: uuid("turn_id")
    .references(() => sessionTurns.id, { onDelete: "cascade" })
    .notNull(),
  role: sessionMessageRoleEnum("role").notNull(),
  status: sessionMessageStatusEnum("status").notNull(),
  toolCallId: text("tool_call_id"),
  toolName: text("tool_name"),
  isError: boolean("is_error").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("session_messages_company_id_idx").on(table.companyId),
  companySessionCreatedIdIndex: index("session_messages_company_session_created_id_idx")
    .on(table.companyId, table.sessionId, table.createdAt, table.id),
  sessionIdIndex: index("session_messages_session_id_idx").on(table.sessionId),
  sessionTurnIdIndex: index("session_messages_session_turn_id_idx").on(table.sessionId, table.turnId),
}));

export const messageContents = pgTable("message_contents", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  messageId: uuid("message_id")
    .references(() => sessionMessages.id, { onDelete: "cascade" })
    .notNull(),
  type: messageContentTypeEnum("type").notNull(),
  text: text("text"),
  data: text("data"),
  mimeType: text("mime_type"),
  structuredContent: jsonb("structured_content"),
  toolCallId: text("tool_call_id"),
  toolName: text("tool_name"),
  arguments: jsonb("arguments"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("message_contents_company_id_idx").on(table.companyId),
  sessionIdIndex: index("message_contents_message_id_idx").on(table.messageId),
}));

export const sessionQueuedMessages = pgTable("session_queued_messages", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  shouldSteer: boolean("should_steer").notNull(),
  status: sessionQueuedMessageStatusEnum("status").notNull(),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("session_queued_messages_company_id_idx").on(table.companyId),
  sessionIdIndex: index("session_queued_messages_session_id_idx").on(table.sessionId),
}));

export const sessionQueuedMessageContents = pgTable("session_queued_message_contents", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  sessionQueuedMessageId: uuid("session_queued_message_id")
    .references(() => sessionQueuedMessages.id, { onDelete: "cascade" })
    .notNull(),
  type: messageContentTypeEnum("type").notNull(),
  text: text("text"),
  data: text("data"),
  mimeType: text("mime_type"),
  structuredContent: jsonb("structured_content"),
  toolCallId: text("tool_call_id"),
  toolName: text("tool_name"),
  arguments: jsonb("arguments"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("session_queued_message_contents_company_id_idx").on(table.companyId),
  sessionQueuedMessageIdIndex: index("session_queued_message_contents_session_queued_message_id_idx")
    .on(table.sessionQueuedMessageId),
}));

export const agentInboxItems = pgTable("agent_inbox_items", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  toolCallId: text("tool_call_id"),
  kind: agentInboxKindEnum("kind").notNull(),
  status: agentInboxStatusEnum("status").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedByUserId: uuid("resolved_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
}, (table) => ({
  companyIdIndex: index("agent_inbox_items_company_id_idx").on(table.companyId),
  sessionIdIndex: index("agent_inbox_items_session_id_idx").on(table.sessionId),
  agentIdIndex: index("agent_inbox_items_agent_id_idx").on(table.agentId),
  statusIndex: index("agent_inbox_items_status_idx").on(table.status),
}));

export const agentInboxHumanQuestions = pgTable("agent_inbox_human_questions", {
  inboxItemId: uuid("inbox_item_id")
    .references(() => agentInboxItems.id, { onDelete: "cascade" })
    .primaryKey(),
  questionText: text("question_text").notNull(),
  allowCustomAnswer: boolean("allow_custom_answer").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  inboxItemIdIndex: index("agent_inbox_human_questions_inbox_item_id_idx").on(table.inboxItemId),
}));

export const agentInboxHumanQuestionProposals = pgTable("agent_inbox_human_question_proposals", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  inboxItemId: uuid("inbox_item_id")
    .references(() => agentInboxItems.id, { onDelete: "cascade" })
    .notNull(),
  answerText: text("answer_text").notNull(),
  rating: integer("rating").notNull(),
  sortOrder: integer("sort_order").notNull(),
  pros: text("pros").array().notNull(),
  cons: text("cons").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  inboxItemIdIndex: index("agent_inbox_human_question_proposals_inbox_item_id_idx").on(table.inboxItemId),
  ratingCheck: check(
    "agent_inbox_human_question_proposals_rating_check",
    sql`${table.rating} >= 1 AND ${table.rating} <= 5`,
  ),
}));

export const agentInboxHumanQuestionAnswers = pgTable("agent_inbox_human_question_answers", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  inboxItemId: uuid("inbox_item_id")
    .references(() => agentInboxItems.id, { onDelete: "cascade" })
    .notNull(),
  selectedProposalId: uuid("selected_proposal_id")
    .references(() => agentInboxHumanQuestionProposals.id, { onDelete: "set null" }),
  customAnswerText: text("custom_answer_text"),
  finalAnswerText: text("final_answer_text").notNull(),
  answeredByUserId: uuid("answered_by_user_id")
    .references(() => users.id, { onDelete: "restrict" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  inboxItemIdIndex: uniqueIndex("agent_inbox_human_question_answers_inbox_item_id_uidx").on(table.inboxItemId),
}));

export const agentSessionSecrets = pgTable("agent_session_secrets", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  secretId: uuid("secret_id")
    .references(() => companySecrets.id, { onDelete: "cascade" })
    .notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.sessionId, table.secretId] }),
  companyIdIndex: index("agent_session_secrets_company_id_idx").on(table.companyId),
  sessionIdIndex: index("agent_session_secrets_session_id_idx").on(table.sessionId),
  secretIdIndex: index("agent_session_secrets_secret_id_idx").on(table.secretId),
}));
