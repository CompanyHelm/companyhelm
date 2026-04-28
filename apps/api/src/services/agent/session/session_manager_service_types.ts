import { agentSessions } from "../../../db/schema.ts";

export type AgentRecord = {
  defaultModelCredentialSource: "platform" | "user_provided";
  defaultPlatformModelId: string | null;
  defaultModelProviderCredentialModelId: string | null;
  defaultReasoningLevel: string | null;
  id: string;
};

export type ExistingSessionRow = {
  agentId: string;
  currentModelCredentialSource: "platform" | "user_provided";
  currentPlatformModelId: string | null;
  currentPlatformModelProviderCredentialModelId: string | null;
  currentModelProviderCredentialModelId: string | null;
  currentReasoningLevel: string;
  id: string;
  inferredTitle?: string | null;
  ownerUserId?: string | null;
  status: string;
  userSetTitle?: string | null;
};

export type ModelRecord = {
  id: string;
  modelCredentialSource: "platform" | "user_provided";
  modelId: string;
  modelProviderCredentialId: string | null;
  platformModelId: string | null;
  platformModelProviderCredentialId: string | null;
  platformModelProviderCredentialModelId: string | null;
  modelProviderCredentialModelId: string | null;
  reasoningLevels: string[] | null;
};

export type AgentDefaultSecretRecord = {
  createdByUserId: string | null;
  secretId: string;
};

export type AgentSessionSecretRecord = {
  createdByUserId: string | null;
  secretId: string;
};

export type SessionRecord = {
  agentId: string;
  createdAt: Date;
  currentContextTokens: number | null;
  currentModelId: string;
  currentModelCredentialSource: "platform" | "user_provided";
  currentPlatformModelId: string | null;
  currentPlatformModelProviderCredentialModelId: string | null;
  currentModelProviderCredentialModelId: string | null;
  currentReasoningLevel: string;
  id: string;
  inferredTitle: string | null;
  isCompacting: boolean;
  isThinking: boolean;
  lastUserMessageAt: Date | null;
  maxContextTokens: number | null;
  status: string;
  thinkingText: string | null;
  updatedAt: Date;
  userSetTitle: string | null;
};

export type SessionPromptImageInput = {
  base64EncodedImage: string;
  mimeType: string;
};

export type SessionMessagePrincipalMetadata = {
  principalAgentId?: string | null;
  principalSessionId?: string | null;
  principalType?: "agent_message" | "github_webhook" | "task" | "user" | "workflow";
  taskRunId?: string | null;
  workflowRunId?: string | null;
};

export type SessionManagerCreateSessionOptions = {
  images?: SessionPromptImageInput[];
  modelCredentialSource?: "platform" | "user_provided" | null;
  platformModelId?: string | null;
  platformModelProviderCredentialModelId?: string | null;
  modelProviderCredentialModelId?: string | null;
  principalMetadata?: SessionMessagePrincipalMetadata;
  reasoningLevel?: string | null;
  sessionId?: string | null;
  shouldSteer?: boolean;
  userId?: string | null;
};

export type SessionManagerQueuePromptOptions = {
  images?: SessionPromptImageInput[];
  modelCredentialSource?: "platform" | "user_provided" | null;
  platformModelId?: string | null;
  platformModelProviderCredentialModelId?: string | null;
  modelProviderCredentialModelId?: string | null;
  principalMetadata?: SessionMessagePrincipalMetadata;
  reasoningLevel?: string | null;
  shouldSteer?: boolean;
  userId?: string | null;
};

export type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

export type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown> | Record<string, unknown>[]): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

export type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): {
        returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

export type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
};

export const agentSessionSelection = {
  id: agentSessions.id,
  agentId: agentSessions.agentId,
  currentModelCredentialSource: agentSessions.currentModelCredentialSource,
  currentPlatformModelId: agentSessions.currentPlatformModelId,
  currentPlatformModelProviderCredentialModelId: agentSessions.currentPlatformModelProviderCredentialModelId,
  currentModelProviderCredentialModelId: agentSessions.currentModelProviderCredentialModelId,
  currentReasoningLevel: agentSessions.currentReasoningLevel,
  currentContextTokens: agentSessions.currentContextTokens,
  inferredTitle: agentSessions.inferredTitle,
  isCompacting: agentSessions.isCompacting,
  isThinking: agentSessions.isThinking,
  lastUserMessageAt: agentSessions.lastUserMessageAt,
  maxContextTokens: agentSessions.maxContextTokens,
  status: agentSessions.status,
  thinkingText: agentSessions.thinkingText,
  createdAt: agentSessions.created_at,
  updatedAt: agentSessions.updated_at,
  userSetTitle: agentSessions.userSetTitle,
};
