import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import {
  modelProviderCredentialModels,
  platformModelProviderCredentialModels,
  platformModelProviderCredentials,
  platformModelRoutes,
  platformModels,
  sessionTurns,
} from "../../../db/schema.ts";
import { PlatformLlmCredentialAccess } from "../../../db/platform_llm_credential_access.ts";
import type {
  AgentRecord,
  ExistingSessionRow,
  ModelRecord,
  SelectableDatabase,
} from "./session_manager_service_types.ts";

/**
 * Resolves platform and company-provided model rows into one normalized selection record so
 * session creation, prompt steering, and runtime execution can enforce the same model policy
 * without exposing platform credential IDs through company-facing APIs.
 */
@injectable()
export class SessionModelSelectionService {
  async resolveDefaultModelRecord(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    agentRecord: AgentRecord,
  ): Promise<ModelRecord> {
    if (agentRecord.defaultModelCredentialSource === "platform") {
      if (!agentRecord.defaultPlatformModelId) {
        throw new Error("Agent default platform model is required.");
      }

      return this.resolvePlatformModelRecordById(
        selectableDatabase,
        agentRecord.defaultPlatformModelId,
      );
    }

    if (!agentRecord.defaultModelProviderCredentialModelId) {
      throw new Error("Agent default model is required.");
    }

    return this.resolveUserProvidedModelRecordById(
      selectableDatabase,
      companyId,
      agentRecord.defaultModelProviderCredentialModelId,
    );
  }

  async resolveModelRecordBySelection(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    input: {
      modelCredentialSource?: "platform" | "user_provided" | null;
      modelProviderCredentialModelId?: string | null;
      platformModelId?: string | null;
      platformModelProviderCredentialModelId?: string | null;
    },
  ): Promise<ModelRecord | null> {
    if (input.modelCredentialSource === "platform" || input.platformModelId || input.platformModelProviderCredentialModelId) {
      const platformModelId = input.platformModelId
        ?? await this.resolvePlatformModelIdForCredentialModel(selectableDatabase, input.platformModelProviderCredentialModelId);
      if (!platformModelId) {
        throw new Error("platformModelId is required.");
      }

      return this.resolvePlatformModelRecordById(selectableDatabase, platformModelId);
    }

    if (input.modelProviderCredentialModelId) {
      return this.resolveUserProvidedModelRecordById(selectableDatabase, companyId, input.modelProviderCredentialModelId);
    }

    return null;
  }

  async resolveUserProvidedModelRecordById(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    modelProviderCredentialModelId: string,
  ): Promise<ModelRecord> {
    const [modelRecord] = await selectableDatabase
      .select({
        id: modelProviderCredentialModels.id,
        modelId: modelProviderCredentialModels.modelId,
        modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
        reasoningLevels: modelProviderCredentialModels.reasoningLevels,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.id, modelProviderCredentialModelId),
      )) as Array<{
        id: string;
        modelId: string;
        modelProviderCredentialId: string;
        reasoningLevels: string[] | null;
      }>;
    if (!modelRecord) {
      throw new Error("Selected model not found.");
    }

    return {
      id: modelRecord.id,
      modelCredentialSource: "user_provided",
      modelId: modelRecord.modelId,
      modelProviderCredentialId: modelRecord.modelProviderCredentialId,
      modelProviderCredentialModelId: modelRecord.id,
      platformModelId: null,
      platformModelProviderCredentialId: null,
      platformModelProviderCredentialModelId: null,
      reasoningLevels: modelRecord.reasoningLevels,
    };
  }

  async resolvePlatformModelRecordById(
    selectableDatabase: SelectableDatabase,
    platformModelId: string,
  ): Promise<ModelRecord> {
    const [modelRecord] = await selectableDatabase
      .select({
        description: platformModels.description,
        id: platformModels.id,
        modelId: platformModels.modelId,
        name: platformModels.name,
        reasoningLevels: platformModels.reasoningLevels,
        reasoningSupported: platformModels.reasoningSupported,
      })
      .from(platformModels)
      .where(and(
        eq(platformModels.id, platformModelId),
        eq(platformModels.isAvailable, true),
      )) as Array<{
        id: string;
        modelId: string;
        reasoningLevels: string[] | null;
      }>;
    if (!modelRecord) {
      throw new Error("Selected platform model not found.");
    }
    const routeRecord = await this.resolvePlatformModelRoute(selectableDatabase, modelRecord.id);

    return {
      id: modelRecord.id,
      modelCredentialSource: "platform",
      modelId: modelRecord.modelId,
      modelProviderCredentialId: null,
      modelProviderCredentialModelId: null,
      platformModelId: modelRecord.id,
      platformModelProviderCredentialId: routeRecord.platformModelProviderCredentialId,
      platformModelProviderCredentialModelId: routeRecord.platformModelProviderCredentialModelId,
      reasoningLevels: modelRecord.reasoningLevels,
    };
  }

  private async resolvePlatformModelRoute(
    selectableDatabase: SelectableDatabase,
    platformModelId: string,
  ): Promise<{
    platformModelProviderCredentialId: string;
    platformModelProviderCredentialModelId: string;
  }> {
    await PlatformLlmCredentialAccess.enable(selectableDatabase);
    const routeRecords = await selectableDatabase
      .select({
        createdAt: platformModelRoutes.createdAt,
        id: platformModelRoutes.id,
        platformModelProviderCredentialModelId: platformModelRoutes.platformModelProviderCredentialModelId,
      })
      .from(platformModelRoutes)
      .where(eq(platformModelRoutes.platformModelId, platformModelId)) as Array<{
        createdAt: Date;
        id: string;
        platformModelProviderCredentialModelId: string;
      }>;
    const availableRoutes = [];
    for (const routeRecord of routeRecords) {
      const [credentialModelRecord] = await selectableDatabase
        .select({
          id: platformModelProviderCredentialModels.id,
          platformModelProviderCredentialId: platformModelProviderCredentialModels.platformModelProviderCredentialId,
        })
        .from(platformModelProviderCredentialModels)
        .where(and(
          eq(platformModelProviderCredentialModels.id, routeRecord.platformModelProviderCredentialModelId),
          eq(platformModelProviderCredentialModels.isAvailable, true),
        )) as Array<{
          id: string;
          platformModelProviderCredentialId: string;
        }>;
      if (!credentialModelRecord) {
        continue;
      }

      const [credentialRecord] = await selectableDatabase
        .select({
          id: platformModelProviderCredentials.id,
        })
        .from(platformModelProviderCredentials)
        .where(and(
          eq(platformModelProviderCredentials.id, credentialModelRecord.platformModelProviderCredentialId),
          eq(platformModelProviderCredentials.status, "active"),
        )) as Array<{ id: string }>;
      if (!credentialRecord) {
        continue;
      }

      availableRoutes.push({
        createdAt: routeRecord.createdAt,
        id: routeRecord.id,
        platformModelProviderCredentialId: credentialModelRecord.platformModelProviderCredentialId,
        platformModelProviderCredentialModelId: credentialModelRecord.id,
      });
    }
    if (availableRoutes.length === 0) {
      throw new Error("Selected platform model has no available routes.");
    }

    const turnRecords = await selectableDatabase
      .select({
        id: sessionTurns.id,
      })
      .from(sessionTurns)
      .where(eq(sessionTurns.platformModelId, platformModelId)) as Array<{ id: string }>;
    const routeIndex = turnRecords.length % availableRoutes.length;
    const sortedRoutes = availableRoutes.sort((left, right) => {
      const createdAtComparison = left.createdAt.getTime() - right.createdAt.getTime();
      if (createdAtComparison !== 0) {
        return createdAtComparison;
      }

      return left.id.localeCompare(right.id);
    });
    return sortedRoutes[routeIndex] ?? sortedRoutes[0];
  }

  private async resolvePlatformModelIdForCredentialModel(
    selectableDatabase: SelectableDatabase,
    platformModelProviderCredentialModelId: string | null | undefined,
  ): Promise<string | null> {
    if (!platformModelProviderCredentialModelId) {
      return null;
    }

    const [routeRecord] = await selectableDatabase
      .select({
        platformModelId: platformModelRoutes.platformModelId,
      })
      .from(platformModelRoutes)
      .where(eq(
        platformModelRoutes.platformModelProviderCredentialModelId,
        platformModelProviderCredentialModelId,
      )) as Array<{ platformModelId: string }>;
    return routeRecord?.platformModelId ?? null;
  }

  async resolveCurrentModelRecord(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    existingSession: ExistingSessionRow,
  ): Promise<ModelRecord> {
    if (existingSession.currentModelCredentialSource === "platform") {
      if (!existingSession.currentPlatformModelId) {
        throw new Error("Current session platform model not found.");
      }

      return this.resolvePlatformModelRecordById(
        selectableDatabase,
        existingSession.currentPlatformModelId,
      );
    }

    if (!existingSession.currentModelProviderCredentialModelId) {
      throw new Error("Current session model not found.");
    }

    return this.resolveUserProvidedModelRecordById(
      selectableDatabase,
      companyId,
      existingSession.currentModelProviderCredentialModelId,
    );
  }

  resolveReasoningLevel(
    supportedLevels: string[] | null,
    requestedReasoningLevel?: string | null,
    fallbackReasoningLevel?: string | null,
  ): string {
    const availableLevels = supportedLevels?.filter((level) => level.length > 0) ?? [];
    if (availableLevels.length === 0) {
      if (requestedReasoningLevel) {
        throw new Error("reasoningLevel is not supported for the selected model.");
      }

      return "";
    }
    if (requestedReasoningLevel) {
      if (!availableLevels.includes(requestedReasoningLevel)) {
        throw new Error("reasoningLevel is not supported for the selected model.");
      }

      return requestedReasoningLevel;
    }
    if (fallbackReasoningLevel && availableLevels.includes(fallbackReasoningLevel)) {
      return fallbackReasoningLevel;
    }

    return availableLevels[0] ?? "";
  }
}
