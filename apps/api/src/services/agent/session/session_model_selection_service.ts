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
 * Resolves the persisted model row and reasoning level policy for session writes. Centralizing
 * these lookups keeps lifecycle and prompt orchestration focused on session state changes instead
 * of duplicating model-selection rules across multiple call paths.
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
        eq(modelProviderCredentialModels.id, agentRecord.defaultModelProviderCredentialModelId),
      )) as ModelRecord[];
    if (!modelRecord) {
      throw new Error("Agent default model not found.");
    }

    return modelRecord;
  }

  async resolveModelRecordById(
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
      )) as ModelRecord[];
    if (!modelRecord) {
      throw new Error("Selected model not found.");
    }

    return modelRecord;
  }

  async resolveCurrentModelRecord(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    existingSession: ExistingSessionRow,
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
        eq(modelProviderCredentialModels.id, existingSession.currentModelProviderCredentialModelId),
      )) as ModelRecord[];
    if (!modelRecord) {
      throw new Error("Current session model not found.");
    }

    return modelRecord;
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
