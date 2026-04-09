import { randomUUID } from "node:crypto";
import {
  type AnyPgColumn,
  check,
  bigint,
  pgTable,
  text,
  pgEnum,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
  uuid,
  boolean,
  jsonb,
  integer
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

export const modelProviderEnum = pgEnum("model_provider", ["openai", "anthropic", "openai-codex", "openrouter"]);
export const modelProviderCredentialTypeEnum = pgEnum("model_provider_credential_type", ["api_key", "oauth_token"]);
export const sessionMessageRoleEnum = pgEnum("session_message_role", ["user", "assistant", "toolResult"]);
export const messageContentTypeEnum = pgEnum("message_content_type", ["text", "image", "toolCall", "thinking"]);
export const agentSessionStatusEnum = pgEnum("agent_session_status", ["queued", "running", "stopped", "archived"]);
export const sessionMessageStatusEnum = pgEnum("session_message_status", ["running", "completed"]);
// it will be deleted on completion of the message, so no completed or failed statuses
// processing means the message got sent to the session using the session SDK e.g. pi mono
export const sessionQueuedMessageStatusEnum = pgEnum("session_queued_message_status", ["pending", "processing"]);
export const agentInboxKindEnum = pgEnum("agent_inbox_kind", ["human_question"]);
export const agentInboxStatusEnum = pgEnum("agent_inbox_status", ["open", "resolved"]);
export const taskStatusEnum = pgEnum("task_status", ["draft", "in_progress", "completed"]);
export const taskRunStatusEnum = pgEnum("task_run_status", ["queued", "running", "completed", "failed", "canceled"]);
export const artifactScopeEnum = pgEnum("artifact_scope", ["company", "task"]);
export const artifactTypeEnum = pgEnum("artifact_type", ["markdown_document", "external_link", "pull_request"]);
export const artifactStateEnum = pgEnum("artifact_state", ["draft", "active", "archived"]);
export const artifactPullRequestProviderEnum = pgEnum("artifact_pull_request_provider", ["github"]);
export const agentEnvironmentPlatformEnum = pgEnum("agent_environment_platform", ["linux", "windows", "macos"]);
export const agentEnvironmentLeaseStateEnum = pgEnum("agent_environment_lease_state", ["active", "idle", "released", "expired"]);
export const computeProviderEnum = pgEnum("compute_provider", ["e2b"]);


export const companies = pgTable("companies", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  clerkOrganizationId: text("clerk_organization_id"),
  name: text("name").notNull()
}, (table) => ({
  clerkOrganizationIdUnique: uniqueIndex("companies_clerk_organization_id_uidx").on(table.clerkOrganizationId),
}));

export const companySettings = pgTable("company_settings", {
  companyId: uuid("company_id")
    .primaryKey()
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  base_system_prompt: text("base_system_prompt"),
});

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  clerkUserId: text("clerk_user_id"),
  first_name: text("first_name").notNull(),
  last_name: text("last_name"),
  email: text("email").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull()
}, (table) => ({
  clerkUserIdUnique: uniqueIndex("users_clerk_user_id_uidx").on(table.clerkUserId),
  emailUnique: uniqueIndex("users_email_uidx").on(table.email),
  firstNameLengthCheck: check("users_first_name_length_check", sql`length(${table.first_name}) <= 255`),
  lastNameLengthCheck: check(
    "users_last_name_length_check",
    sql`${table.last_name} IS NULL OR length(${table.last_name}) <= 255`
  )
}));
export const companyMembers = pgTable("company_members", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
},
(table) => ({
  pk: primaryKey({ columns: [table.companyId, table.userId] }),
  companyIdIndex: index("company_members_company_id_idx").on(table.companyId),
  userIdIndex: index("company_members_user_id_idx").on(table.userId),
}));

export const agents = pgTable("agents", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: text("name").notNull(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
  defaultModelProviderCredentialModelId: uuid("default_model_provider_credential_model_id")
    .references(() => modelProviderCredentialModels.id, { onDelete: "set null" }),
  defaultComputeProviderDefinitionId: uuid("default_compute_provider_definition_id")
    .references(() => computeProviderDefinitions.id, { onDelete: "restrict" }),
  defaultEnvironmentTemplateId: text("default_environment_template_id").notNull(),
  default_reasoning_level: text("default_reasoning_level"),
  system_prompt: text("system_prompt"),
},
(table) => ({
  companyIdIndex: index("agents_company_id_idx").on(table.companyId),
}));

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
  // user initiated chat, optional if session was created by the system
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  // user explicitly set title, it should take precedence over the inferred title
  userSetTitle: text("user_set_title"),
  currentReasoningLevel: text("current_reasoning_level").notNull(),
  status: agentSessionStatusEnum("status").notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  forkedFromTurnId: uuid("forked_from_turn_id")
    .references(() => sessionTurns.id, { onDelete: "set null" }),
  // the latest persisted runtime context from pi mono session.agent.state.messages.
  // It is used to reload the live session state after worker restarts without replaying the full
  // transcript.
  contextMessagesSnapshot: jsonb("context_messages_snapshot"),
  contextMessagesSnapshotAt: timestamp("context_messages_snapshot_at", { withTimezone: true }),
  isThinking: boolean("is_thinking").notNull(),
  thinkingText: text("thinking_text"),
  currentContextTokens: integer("current_context_tokens"),
  maxContextTokens: integer("max_context_tokens"),
  isCompacting: boolean("is_compacting").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("agent_sessions_company_id_idx").on(table.companyId),
}));

export const sessionTurns = pgTable("session_turns", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
},
(table) => ({
  companyIdIndex: index("session_turns_company_id_idx").on(table.companyId),
  sessionIdIndex: index("session_turns_session_id_idx").on(table.sessionId),
  sessionStartedAtIndex: index("session_turns_session_started_at_idx").on(table.sessionId, table.startedAt),
}));

export const sessionContextCheckpoints = pgTable("session_context_checkpoints", {
  turnId: uuid("turn_id")
    .primaryKey()
    .references(() => sessionTurns.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  contextMessagesSnapshot: jsonb("context_messages_snapshot").notNull(),
  currentContextTokens: integer("current_context_tokens"),
  maxContextTokens: integer("max_context_tokens"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("session_context_checkpoints_company_id_idx").on(table.companyId),
  sessionIdIndex: index("session_context_checkpoints_session_id_idx").on(table.sessionId),
  sessionCreatedAtIndex: index("session_context_checkpoints_session_created_at_idx").on(table.sessionId, table.createdAt),
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
},
(table) => ({
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
},
(table) => ({
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("session_messages_company_id_idx").on(table.companyId),
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
},
(table) => ({
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
},
(table) => ({
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
},
(table) => ({
  companyIdIndex: index("session_queued_message_contents_company_id_idx").on(table.companyId),
  sessionQueuedMessageIdIndex: index("session_queued_message_contents_session_queued_message_id_idx").on(table.sessionQueuedMessageId),
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

export const modelProviderCredentials = pgTable("model_provider_credentials", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  modelProvider: modelProviderEnum("model_provider").notNull(),
  type: modelProviderCredentialTypeEnum("model_provider_credential_type").notNull(),
  // this can also be an access token
  encryptedApiKey: text("encrypted_api_key").notNull(),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("model_provider_credentials_company_id_idx").on(table.companyId),
  companyDefaultUnique: uniqueIndex("model_provider_credentials_company_default_uidx")
    .on(table.companyId)
    .where(sql`${table.isDefault}`),
  oauthRefreshTokenCheck: check(
    "model_provider_credentials_oauth_refresh_token_check",
    sql`${table.type} <> 'oauth_token' OR ${table.refreshToken} IS NOT NULL`,
  ),
}));

export const companySecrets = pgTable("company_secrets", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  envVarName: text("env_var_name").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  encryptionKeyId: text("encryption_key_id").notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "restrict" })
    .notNull(),
  updatedByUserId: uuid("updated_by_user_id")
    .references(() => users.id, { onDelete: "restrict" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("company_secrets_company_id_idx").on(table.companyId),
  companyNameLowerUnique: uniqueIndex("company_secrets_company_name_lower_uidx")
    .on(table.companyId, sql`lower(${table.name})`),
  companyEnvVarLowerUnique: uniqueIndex("company_secrets_company_env_var_lower_uidx")
    .on(table.companyId, sql`lower(${table.envVarName})`),
  envVarNameCheck: check(
    "company_secrets_env_var_name_check",
    sql`${table.envVarName} ~ '^[A-Z_][A-Z0-9_]*$'`,
  ),
}));

export const computeProviderDefinitions = pgTable("compute_provider_definitions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  provider: computeProviderEnum("provider").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  updatedByUserId: uuid("updated_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("compute_provider_definitions_company_id_idx").on(table.companyId),
  companyProviderIndex: index("compute_provider_definitions_company_provider_idx").on(
    table.companyId,
    table.provider,
  ),
  companyDefaultUnique: uniqueIndex("compute_provider_definitions_company_default_uidx")
    .on(table.companyId)
    .where(sql`${table.isDefault}`),
  companyNameLowerUnique: uniqueIndex("compute_provider_definitions_company_name_lower_uidx")
    .on(table.companyId, sql`lower(${table.name})`),
}));

export const e2bComputeProviderDefinitions = pgTable("e2b_compute_provider_definitions", {
  computeProviderDefinitionId: uuid("compute_provider_definition_id")
    .primaryKey()
    .references(() => computeProviderDefinitions.id, { onDelete: "cascade" }),
  encryptedApiKey: text("encrypted_api_key").notNull(),
  encryptionKeyId: text("encryption_key_id").notNull(),
});

export const agentDefaultSecrets = pgTable("agent_default_secrets", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  secretId: uuid("secret_id")
    .references(() => companySecrets.id, { onDelete: "cascade" })
    .notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.agentId, table.secretId] }),
  companyIdIndex: index("agent_default_secrets_company_id_idx").on(table.companyId),
  agentIdIndex: index("agent_default_secrets_agent_id_idx").on(table.agentId),
  secretIdIndex: index("agent_default_secrets_secret_id_idx").on(table.secretId),
}));

// avaialbe models based on the model provider credential
export const modelProviderCredentialModels = pgTable("model_provider_credential_models", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  modelProviderCredentialId: uuid("model_provider_credential_id")
    .references(() => modelProviderCredentials.id, { onDelete: "cascade" })
    .notNull(),
  modelId: text("model_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  reasoningSupported: boolean("reasoning_supported").notNull().default(false),
  // null if the model does not support reasoning levels
  reasoningLevels: text("reasoning_levels").array(),
  isDefault: boolean("is_default").notNull().default(false),
},
(table) => ({
  companyIdIndex: index("model_provider_credential_models_company_id_idx").on(table.companyId),
  modelProviderCredentialIdIndex: index("model_provider_credential_models_model_provider_credential_id_idx").on(table.modelProviderCredentialId),
  credentialDefaultUnique: uniqueIndex("model_provider_credential_models_credential_default_uidx")
    .on(table.modelProviderCredentialId)
    .where(sql`${table.isDefault}`),
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

export const companyGithubInstallations = pgTable("company_github_installations", {
  installationId: bigint("installation_id", { mode: "number" }).primaryKey(),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("company_github_installations_company_id_idx").on(table.companyId),
}));

export const githubRepositories = pgTable("github_repositories", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  installationId: bigint("installation_id", { mode: "number" })
    .references(() => companyGithubInstallations.installationId, { onDelete: "cascade" })
    .notNull(),
  externalId: text("external_id").notNull(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  htmlUrl: text("html_url"),
  isPrivate: boolean("is_private").notNull(),
  defaultBranch: text("default_branch"),
  archived: boolean("archived").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("github_repositories_company_id_idx").on(table.companyId),
  installationIdIndex: index("github_repositories_installation_id_idx").on(table.installationId),
  uniqueInstallationRepository: uniqueIndex("github_repositories_company_installation_external_uidx")
    .on(table.companyId, table.installationId, table.externalId),
}));

export const taskCategories = pgTable("task_categories", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("task_categories_company_id_idx").on(table.companyId),
  companyCreatedAtIndex: index("task_categories_company_created_at_idx").on(table.companyId, table.createdAt),
  companyNameLowerUnique: uniqueIndex("task_categories_company_id_name_lower_uidx")
    .on(table.companyId, sql`lower(${table.name})`),
}));

export const tasks = pgTable("tasks", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  rootTaskId: uuid("root_task_id")
    .references((): AnyPgColumn => tasks.id, { onDelete: "cascade" })
    .notNull(),
  parentTaskId: uuid("parent_task_id")
    .references((): AnyPgColumn => tasks.id, { onDelete: "cascade" }),
  taskCategoryId: uuid("task_category_id")
    .references(() => taskCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("draft"),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdByAgentId: uuid("created_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  assignedUserId: uuid("assigned_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  assignedAgentId: uuid("assigned_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("tasks_company_id_idx").on(table.companyId),
  rootTaskIdIndex: index("tasks_root_task_id_idx").on(table.rootTaskId),
  parentTaskIdIndex: index("tasks_parent_task_id_idx").on(table.parentTaskId),
  companyTaskCategoryIdIndex: index("tasks_company_task_category_id_idx").on(table.companyId, table.taskCategoryId),
  companyAssignedUserIdIndex: index("tasks_company_assigned_user_id_idx").on(table.companyId, table.assignedUserId),
  companyAssignedAgentIdIndex: index("tasks_company_assigned_agent_id_idx").on(table.companyId, table.assignedAgentId),
  companyStatusCreatedAtIndex: index("tasks_company_status_created_at_idx").on(table.companyId, table.status, table.createdAt),
  oneCreatorCheck: check(
    "tasks_one_creator_check",
    sql`num_nonnulls(${table.createdByUserId}, ${table.createdByAgentId}) <= 1`,
  ),
  oneAssigneeCheck: check(
    "tasks_one_assignee_check",
    sql`num_nonnulls(${table.assignedUserId}, ${table.assignedAgentId}) <= 1`,
  ),
}));

export const taskRuns = pgTable("task_runs", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  taskId: uuid("task_id")
    .references(() => tasks.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "restrict" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "set null" }),
  status: taskRunStatusEnum("status").notNull().default("queued"),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdByAgentId: uuid("created_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull(),
  endedReason: text("ended_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("task_runs_company_id_idx").on(table.companyId),
  taskCreatedAtIndex: index("task_runs_task_created_at_idx").on(table.taskId, table.createdAt),
  agentCreatedAtIndex: index("task_runs_agent_created_at_idx").on(table.agentId, table.createdAt),
  sessionIdUnique: uniqueIndex("task_runs_session_id_uidx").on(table.sessionId),
  openTaskRunUnique: uniqueIndex("task_runs_open_task_id_uidx")
    .on(table.taskId)
    .where(sql`${table.finishedAt} IS NULL`),
  oneCreatorCheck: check(
    "task_runs_one_creator_check",
    sql`num_nonnulls(${table.createdByUserId}, ${table.createdByAgentId}) <= 1`,
  ),
}));

export const artifacts = pgTable("artifacts", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  taskId: uuid("task_id")
    .references(() => tasks.id, { onDelete: "cascade" }),
  scopeType: artifactScopeEnum("scope_type").notNull(),
  type: artifactTypeEnum("type").notNull(),
  state: artifactStateEnum("state").notNull().default("active"),
  name: text("name").notNull(),
  description: text("description"),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdByAgentId: uuid("created_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  updatedByUserId: uuid("updated_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  updatedByAgentId: uuid("updated_by_agent_id")
    .references(() => agents.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("artifacts_company_id_idx").on(table.companyId),
  companyScopeUpdatedAtIndex: index("artifacts_company_scope_updated_at_idx")
    .on(table.companyId, table.scopeType, table.updatedAt),
  taskIdIndex: index("artifacts_task_id_idx").on(table.taskId),
  scopeTaskIdCheck: check(
    "artifacts_scope_task_id_check",
    sql`(${table.scopeType} = 'company' AND ${table.taskId} IS NULL) OR (${table.scopeType} = 'task' AND ${table.taskId} IS NOT NULL)`,
  ),
}));

export const artifactMarkdownDocuments = pgTable("artifact_markdown_documents", {
  artifactId: uuid("artifact_id")
    .references(() => artifacts.id, { onDelete: "cascade" })
    .primaryKey(),
  contentMarkdown: text("content_markdown").notNull(),
}, (table) => ({
  artifactIdIndex: index("artifact_markdown_documents_artifact_id_idx").on(table.artifactId),
}));

export const artifactExternalLinks = pgTable("artifact_external_links", {
  artifactId: uuid("artifact_id")
    .references(() => artifacts.id, { onDelete: "cascade" })
    .primaryKey(),
  url: text("url").notNull(),
}, (table) => ({
  artifactIdIndex: index("artifact_external_links_artifact_id_idx").on(table.artifactId),
}));

export const artifactPullRequests = pgTable("artifact_pull_requests", {
  artifactId: uuid("artifact_id")
    .references(() => artifacts.id, { onDelete: "cascade" })
    .primaryKey(),
  provider: artifactPullRequestProviderEnum("provider").notNull().default("github"),
  repository: text("repository"),
  pullRequestNumber: integer("pull_request_number"),
  url: text("url").notNull(),
}, (table) => ({
  artifactIdIndex: index("artifact_pull_requests_artifact_id_idx").on(table.artifactId),
}));

export const agentEnvironments = pgTable("agent_environments", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  provider: computeProviderEnum("provider").notNull(),
  providerDefinitionId: uuid("provider_definition_id")
    .references(() => computeProviderDefinitions.id, { onDelete: "restrict" }),
  providerEnvironmentId: text("provider_environment_id").notNull(),
  templateId: text("template_id").notNull(),
  displayName: text("display_name"),
  platform: agentEnvironmentPlatformEnum("platform").notNull(),
  cpuCount: integer("cpu_count").notNull(),
  memoryGb: integer("memory_gb").notNull(),
  diskSpaceGb: integer("disk_space_gb").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
},
(table) => ({
  companyIdIndex: index("agent_environments_company_id_idx").on(table.companyId),
  agentIdIndex: index("agent_environments_agent_id_idx").on(table.agentId),
  providerDefinitionIdIndex: index("agent_environments_provider_definition_id_idx").on(table.providerDefinitionId),
  providerEnvironmentIdIndex: index("agent_environments_provider_environment_id_idx").on(table.provider, table.providerEnvironmentId),
}));

export const agentEnvironmentLeases = pgTable("agent_environment_leases", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  environmentId: uuid("environment_id")
    .references(() => agentEnvironments.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => agentSessions.id, { onDelete: "cascade" })
    .notNull(),
  state: agentEnvironmentLeaseStateEnum("state").notNull(),
  ownerToken: text("owner_token"),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull(),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  releaseReason: text("release_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
},
(table) => ({
  companyIdIndex: index("agent_environment_leases_company_id_idx").on(table.companyId),
  environmentIdIndex: index("agent_environment_leases_environment_id_idx").on(table.environmentId),
  agentIdIndex: index("agent_environment_leases_agent_id_idx").on(table.agentId),
  sessionIdIndex: index("agent_environment_leases_session_id_idx").on(table.sessionId),
  stateExpiresAtIndex: index("agent_environment_leases_state_expires_at_idx").on(table.state, table.expiresAt),
  openLeaseUnique: uniqueIndex("agent_environment_leases_open_environment_uidx")
    .on(table.environmentId)
    .where(sql`${table.state} in ('active', 'idle')`),
}));

export const skills = pgTable("skills", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  instructions: text("instructions").notNull(),
  // the list of files that are part of the skill, excluding the SKILL.md file
  // a skill folder contains the SKILL.md file and the skill files at the same level
  // includes nested folders and files
  // if the skill has files they will need to instanciated in a enviornment on skill activation
  fileList: text("file_list").array().notNull(),

  skillGroupId: uuid("skill_group_id")
    .references(() => skill_groups.id, { onDelete: "set null" }),

  /****************** GITHUB SKILL FIELDS ********************/
  repository: text("repository"),
  // where in the repository the skill is located
  skillDirectory: text("skill_directory"),
}, (table) => ({
  skillGroupIdIndex: index("skills_skill_group_id_idx").on(table.skillGroupId),
  companyIdIndex: index("skills_company_id_idx").on(table.companyId),
}));

export const skill_groups = pgTable("skill_groups", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
}, (table) => ({
  companyIdIndex: index("skill_groups_company_id_idx").on(table.companyId),
}));

export const agentSkills = pgTable("agent_skills", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  skillId: uuid("skill_id")
    .references(() => skills.id, { onDelete: "cascade" })
    .notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.agentId, table.skillId] }),
  companyIdIndex: index("agent_skills_company_id_idx").on(table.companyId),
  agentIdIndex: index("agent_skills_agent_id_idx").on(table.agentId),
  skillIdIndex: index("agent_skills_skill_id_idx").on(table.skillId),
}));

export const agentSkillGroups = pgTable("agent_skill_groups", {
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  skillGroupId: uuid("skill_group_id")
    .references(() => skill_groups.id, { onDelete: "cascade" })
    .notNull(),
  createdByUserId: uuid("created_by_user_id")
    .references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.agentId, table.skillGroupId] }),
  companyIdIndex: index("agent_skill_groups_company_id_idx").on(table.companyId),
  agentIdIndex: index("agent_skill_groups_agent_id_idx").on(table.agentId),
  skillGroupIdIndex: index("agent_skill_groups_skill_group_id_idx").on(table.skillGroupId),
}));
