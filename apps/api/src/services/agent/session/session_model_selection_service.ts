import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { modelProviderCredentialModels, platformModelProviderCredentialModels } from "../../../db/schema.ts";
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
      if (!agentRecord.defaultPlatformModelProviderCredentialModelId) {
        throw new Error("Agent default platform model is required.");
      }

      return this.resolvePlatformModelRecordById(
        selectableDatabase,
        agentRecord.defaultPlatformModelProviderCredentialModelId,
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
      platformModelProviderCredentialModelId?: string | null;
    },
  ): Promise<ModelRecord | null> {
    if (input.modelCredentialSource === "platform" || input.platformModelProviderCredentialModelId) {
      if (!input.platformModelProviderCredentialModelId) {
        throw new Error("platformModelProviderCredentialModelId is required.");
      }

      return this.resolvePlatformModelRecordById(selectableDatabase, input.platformModelProviderCredentialModelId);
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
      platformModelProviderCredentialId: null,
      platformModelProviderCredentialModelId: null,
      reasoningLevels: modelRecord.reasoningLevels,
    };
  }

  async resolvePlatformModelRecordById(
    selectableDatabase: SelectableDatabase,
    platformModelProviderCredentialModelId: string,
  ): Promise<ModelRecord> {
    const [modelRecord] = await selectableDatabase
      .select({
        id: platformModelProviderCredentialModels.id,
        modelId: platformModelProviderCredentialModels.modelId,
        platformModelProviderCredentialId: platformModelProviderCredentialModels.platformModelProviderCredentialId,
        reasoningLevels: platformModelProviderCredentialModels.reasoningLevels,
      })
      .from(platformModelProviderCredentialModels)
      .where(and(
        eq(platformModelProviderCredentialModels.id, platformModelProviderCredentialModelId),
        eq(platformModelProviderCredentialModels.isAvailable, true),
      )) as Array<{
        id: string;
        modelId: string;
        platformModelProviderCredentialId: string;
        reasoningLevels: string[] | null;
      }>;
    if (!modelRecord) {
      throw new Error("Selected platform model not found.");
    }

    return {
      id: modelRecord.id,
      modelCredentialSource: "platform",
      modelId: modelRecord.modelId,
      modelProviderCredentialId: null,
      modelProviderCredentialModelId: null,
      platformModelProviderCredentialId: modelRecord.platformModelProviderCredentialId,
      platformModelProviderCredentialModelId: modelRecord.id,
      reasoningLevels: modelRecord.reasoningLevels,
    };
  }

  async resolveCurrentModelRecord(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    existingSession: ExistingSessionRow,
  ): Promise<ModelRecord> {
    if (existingSession.currentModelCredentialSource === "platform") {
      if (!existingSession.currentPlatformModelProviderCredentialModelId) {
        throw new Error("Current session platform model not found.");
      }

      return this.resolvePlatformModelRecordById(
        selectableDatabase,
        existingSession.currentPlatformModelProviderCredentialModelId,
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
