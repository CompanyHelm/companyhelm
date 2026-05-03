import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { modelProviderCredentialModels } from "../../../db/schema.ts";
import type {
  AgentRecord,
  ExistingSessionRow,
  ModelRecord,
  SelectableDatabase,
} from "./session_manager_service_types.ts";

/**
 * Resolves company-provided model rows into one normalized selection record so session creation,
 * prompt steering, and runtime execution all enforce the same OSS credential policy.
 */
@injectable()
export class SessionModelSelectionService {
  async resolveDefaultModelRecord(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    agentRecord: AgentRecord,
  ): Promise<ModelRecord> {
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
      modelProviderCredentialModelId?: string | null;
    },
  ): Promise<ModelRecord | null> {
    if (!input.modelProviderCredentialModelId) {
      return null;
    }

    return this.resolveUserProvidedModelRecordById(selectableDatabase, companyId, input.modelProviderCredentialModelId);
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
      modelId: modelRecord.modelId,
      modelProviderCredentialId: modelRecord.modelProviderCredentialId,
      modelProviderCredentialModelId: modelRecord.id,
      reasoningLevels: modelRecord.reasoningLevels,
    };
  }

  async resolveCurrentModelRecord(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    existingSession: ExistingSessionRow,
  ): Promise<ModelRecord> {
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
