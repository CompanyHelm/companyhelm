import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import type { DatabaseTransactionInterface } from "../../db/database_interface.ts";
import {
  agents,
  agentSessions,
  companyOnboardings,
  computeProviderDefinitions,
  messageContents,
  modelProviderCredentialModels,
  sessionMessages,
  sessionTurns,
  userSessionReads,
  workflowDefinitions,
  workflowRuns,
  workflowRunSteps,
} from "../../db/schema.ts";

type PreviewSeedParameters = {
  companyId: string;
  userId: string;
};

type InsertableDatabase = DatabaseTransactionInterface & {
  insert(table: unknown): {
    values(value: unknown): {
      onConflictDoNothing(): Promise<unknown>;
    };
  };
};

type UpdateableDatabase = DatabaseTransactionInterface & {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<unknown>;
    };
  };
};

type DefaultModelRecord = {
  id: string;
};

type DefaultComputeProviderDefinitionRecord = {
  id: string;
};

const PREVIEW_AGENT_ID = "11111111-1111-4111-8111-111111111111";
const PREVIEW_SESSION_ID = "33333333-3333-4333-8333-333333333333";
const PREVIEW_TURN_USER_ID = "55555555-5555-4555-8555-555555555551";
const PREVIEW_TURN_ASSISTANT_ID = "55555555-5555-4555-8555-555555555552";
const PREVIEW_MESSAGE_USER_ID = "66666666-6666-4666-8666-666666666661";
const PREVIEW_MESSAGE_ASSISTANT_ID = "66666666-6666-4666-8666-666666666662";
const PREVIEW_MESSAGE_USER_CONTENT_ID = "77777777-7777-4777-8777-777777777771";
const PREVIEW_MESSAGE_ASSISTANT_CONTENT_ID = "77777777-7777-4777-8777-777777777772";
const PREVIEW_WORKFLOW_DEFINITION_ID = "22222222-2222-4222-8222-222222222222";
const PREVIEW_WORKFLOW_RUN_ID = "44444444-4444-4444-8444-444444444444";

const PREVIEW_WORKFLOW_STEPS = [
  "Pre-deploy check",
  "Check prod/dev configs",
  "Build API image",
  "Push API image",
  "Deploy API service",
  "Run database migration",
  "Warm edge cache",
  "Upload web assets",
  "Deploy web assets",
  "Purge CDN cache",
  "Smoke test sign-in",
  "Smoke test billing",
  "Post deploy metrics check",
  "Validate",
] as const;

/**
 * Seeds one deterministic chat session and workflow run that exercise the expanded workflow strip
 * directly inside the real CompanyHelm chats page during local development.
 */
@injectable()
export class LocalDevPreviewSeedService {
  async ensurePreviewData(transaction: DatabaseTransactionInterface, params: PreviewSeedParameters): Promise<void> {
    await this.ensureOnboardingIsSkipped(transaction, params);

    const previewSession = await transaction
      .select({
        id: agentSessions.id,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, params.companyId),
        eq(agentSessions.id, PREVIEW_SESSION_ID),
      ))
      .limit(1) as Array<{ id: string }>;
    if (previewSession[0]) {
      return;
    }

    const [defaultModel] = await transaction
      .select({
        id: modelProviderCredentialModels.id,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, params.companyId),
        eq(modelProviderCredentialModels.isDefault, true),
      ))
      .limit(1) as DefaultModelRecord[];
    if (!defaultModel) {
      throw new Error("Local preview seeding requires a default model provider credential model.");
    }

    const [defaultComputeProviderDefinition] = await transaction
      .select({
        id: computeProviderDefinitions.id,
      })
      .from(computeProviderDefinitions)
      .where(and(
        eq(computeProviderDefinitions.companyId, params.companyId),
        eq(computeProviderDefinitions.isDefault, true),
      ))
      .limit(1) as DefaultComputeProviderDefinitionRecord[];
    if (!defaultComputeProviderDefinition) {
      throw new Error("Local preview seeding requires a default compute provider definition.");
    }

    const insertableDatabase = transaction as unknown as InsertableDatabase;
    const now = new Date("2026-04-23T12:00:00.000Z");
    const userPromptTimestamp = new Date("2026-04-23T12:01:00.000Z");
    const assistantReplyTimestamp = new Date("2026-04-23T12:02:00.000Z");

    await insertableDatabase.insert(agents).values({
      companyId: params.companyId,
      created_at: now,
      defaultComputeProviderDefinitionId: defaultComputeProviderDefinition.id,
      defaultEnvironmentTemplateId: "medium",
      defaultModelProviderCredentialModelId: defaultModel.id,
      default_reasoning_level: "high",
      id: PREVIEW_AGENT_ID,
      name: "Workflow Preview Agent",
      system_prompt: "Local development preview agent used only for the chats workflow strip demo.",
      updated_at: now,
    }).onConflictDoNothing();

    await insertableDatabase.insert(workflowDefinitions).values({
      companyId: params.companyId,
      createdAt: now,
      createdByUserId: params.userId,
      description: "Local development deployment preview workflow.",
      id: PREVIEW_WORKFLOW_DEFINITION_ID,
      instructions_template: "Preview deployment workflow for the chats page.",
      isEnabled: true,
      name: "Prod deploy",
      updatedAt: now,
    }).onConflictDoNothing();

    await insertableDatabase.insert(agentSessions).values({
      agentId: PREVIEW_AGENT_ID,
      companyId: params.companyId,
      created_at: now,
      currentContextTokens: 4096,
      currentModelProviderCredentialModelId: defaultModel.id,
      currentReasoningLevel: "high",
      forkedFromTurnId: null,
      id: PREVIEW_SESSION_ID,
      inferredTitle: "Workflow preview chat",
      isCompacting: false,
      isThinking: false,
      lastUserMessageAt: userPromptTimestamp,
      maxContextTokens: 128000,
      ownerUserId: params.userId,
      status: "running",
      thinkingText: null,
      updated_at: assistantReplyTimestamp,
      userSetTitle: "Workflow preview chat",
    }).onConflictDoNothing();

    await insertableDatabase.insert(workflowRuns).values({
      agentId: PREVIEW_AGENT_ID,
      companyId: params.companyId,
      createdAt: userPromptTimestamp,
      id: PREVIEW_WORKFLOW_RUN_ID,
      instructions: "Deploy the latest web and API changes, then run smoke checks.",
      sessionId: PREVIEW_SESSION_ID,
      source: "manual",
      startedAt: userPromptTimestamp,
      startedByUserId: params.userId,
      status: "running",
      updatedAt: assistantReplyTimestamp,
      workflowDefinitionId: PREVIEW_WORKFLOW_DEFINITION_ID,
    }).onConflictDoNothing();

    await insertableDatabase.insert(workflowRunSteps).values(PREVIEW_WORKFLOW_STEPS.map((name, index) => ({
      companyId: params.companyId,
      id: `88888888-8888-4888-8888-${String(index + 1).padStart(12, "0")}`,
      instructions: `${name} for the local workflow preview.`,
      name,
      ordinal: index + 1,
      status: index < 8 ? "done" : index === 8 ? "running" : "pending",
      workflowRunId: PREVIEW_WORKFLOW_RUN_ID,
    }))).onConflictDoNothing();

    await insertableDatabase.insert(sessionTurns).values([
      {
        companyId: params.companyId,
        endedAt: userPromptTimestamp,
        id: PREVIEW_TURN_USER_ID,
        sessionId: PREVIEW_SESSION_ID,
        startedAt: userPromptTimestamp,
      },
      {
        companyId: params.companyId,
        endedAt: assistantReplyTimestamp,
        id: PREVIEW_TURN_ASSISTANT_ID,
        sessionId: PREVIEW_SESSION_ID,
        startedAt: assistantReplyTimestamp,
      },
    ]).onConflictDoNothing();

    await insertableDatabase.insert(sessionMessages).values([
      {
        companyId: params.companyId,
        createdAt: userPromptTimestamp,
        errorMessage: null,
        id: PREVIEW_MESSAGE_USER_ID,
        isError: false,
        principalAgentId: null,
        principalSessionId: null,
        principalType: "user",
        role: "user",
        sessionId: PREVIEW_SESSION_ID,
        status: "completed",
        taskRunId: null,
        toolCallId: null,
        toolName: null,
        turnId: PREVIEW_TURN_USER_ID,
        updatedAt: userPromptTimestamp,
        workflowRunId: PREVIEW_WORKFLOW_RUN_ID,
      },
      {
        companyId: params.companyId,
        createdAt: assistantReplyTimestamp,
        errorMessage: null,
        id: PREVIEW_MESSAGE_ASSISTANT_ID,
        isError: false,
        principalAgentId: PREVIEW_AGENT_ID,
        principalSessionId: PREVIEW_SESSION_ID,
        principalType: "workflow",
        role: "assistant",
        sessionId: PREVIEW_SESSION_ID,
        status: "completed",
        taskRunId: null,
        toolCallId: null,
        toolName: null,
        turnId: PREVIEW_TURN_ASSISTANT_ID,
        updatedAt: assistantReplyTimestamp,
        workflowRunId: PREVIEW_WORKFLOW_RUN_ID,
      },
    ]).onConflictDoNothing();

    await insertableDatabase.insert(messageContents).values([
      {
        arguments: null,
        companyId: params.companyId,
        createdAt: userPromptTimestamp,
        data: null,
        id: PREVIEW_MESSAGE_USER_CONTENT_ID,
        messageId: PREVIEW_MESSAGE_USER_ID,
        mimeType: null,
        structuredContent: null,
        text: "Please deploy the landing page changes and show me the current workflow status in chat.",
        toolCallId: null,
        toolName: null,
        type: "text",
        updatedAt: userPromptTimestamp,
      },
      {
        arguments: null,
        companyId: params.companyId,
        createdAt: assistantReplyTimestamp,
        data: null,
        id: PREVIEW_MESSAGE_ASSISTANT_CONTENT_ID,
        messageId: PREVIEW_MESSAGE_ASSISTANT_ID,
        mimeType: null,
        structuredContent: null,
        text: "The deployment workflow is in progress. Expand the workflow strip above this transcript to inspect the running step and the scroll behavior in the real app.",
        toolCallId: null,
        toolName: null,
        type: "text",
        updatedAt: assistantReplyTimestamp,
      },
    ]).onConflictDoNothing();

    await insertableDatabase.insert(userSessionReads).values({
      companyId: params.companyId,
      createdAt: assistantReplyTimestamp,
      sessionId: PREVIEW_SESSION_ID,
      userId: params.userId,
    }).onConflictDoNothing();
  }

  private async ensureOnboardingIsSkipped(
    transaction: DatabaseTransactionInterface,
    params: PreviewSeedParameters,
  ): Promise<void> {
    const updateableDatabase = transaction as unknown as UpdateableDatabase;
    const skippedAt = new Date("2026-04-23T12:00:00.000Z");

    await updateableDatabase.update(companyOnboardings).set({
      completedAt: null,
      skippedAt,
      skippedByUserId: params.userId,
      status: "skipped",
      updatedAt: skippedAt,
    }).where(eq(companyOnboardings.companyId, params.companyId));
  }
}
