import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { agentSessions, agents, platformModelRoutes, platformModels } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeletePlatformModelMutationArguments = {
  input: {
    id: string;
    replacementPlatformModelId?: string | null;
  };
};

type PlatformModelRecord = {
  createdAt: Date;
  description: string;
  id: string;
  isAvailable: boolean;
  isDefault: boolean;
  key: string;
  modelId: string;
  modelProvider: string;
  name: string;
  reasoningLevels: string[] | null;
  reasoningSupported: boolean;
  agentCount: number;
  routeCount: number;
  sessionCount: number;
  updatedAt: Date;
};

/**
 * Deletes one product-facing platform model from the admin catalog. Routes are deliberately owned
 * by the platform model foreign key, so deleting the model also removes its concrete route rows.
 */
@injectable()
export class DeletePlatformModelMutation extends Mutation<
  DeletePlatformModelMutationArguments,
  PlatformModelRecord
> {
  protected resolve = async (
    arguments_: DeletePlatformModelMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<PlatformModelRecord> => {
    if (context.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }
    const platformModelId = String(arguments_.input.id || "").trim();
    if (!platformModelId) {
      throw new Error("id is required.");
    }
    const replacementPlatformModelId = String(arguments_.input.replacementPlatformModelId || "").trim();

    return transactionProvider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const [platformModel] = await tx
        .select({
          createdAt: platformModels.createdAt,
          description: platformModels.description,
          id: platformModels.id,
          isAvailable: platformModels.isAvailable,
          isDefault: platformModels.isDefault,
          key: platformModels.key,
          modelId: platformModels.modelId,
          modelProvider: platformModels.modelProvider,
          name: platformModels.name,
          reasoningLevels: platformModels.reasoningLevels,
          reasoningSupported: platformModels.reasoningSupported,
          updatedAt: platformModels.updatedAt,
        })
        .from(platformModels)
        .where(eq(platformModels.id, platformModelId)) as Array<Omit<PlatformModelRecord, "routeCount">>;
      if (!platformModel) {
        throw new Error("Platform model not found.");
      }
      const affectedAgentRecords = await tx
        .select({
          id: agents.id,
          name: agents.name,
        })
        .from(agents)
        .where(eq(agents.defaultPlatformModelId, platformModelId)) as Array<{
          id: string;
          name: string;
        }>;
      const affectedSessionRecords = await tx
        .select({
          id: agentSessions.id,
        })
        .from(agentSessions)
        .where(eq(agentSessions.currentPlatformModelId, platformModelId)) as Array<{ id: string }>;
      const requiresReplacement = affectedAgentRecords.length > 0 || affectedSessionRecords.length > 0;
      if (requiresReplacement) {
        if (!replacementPlatformModelId) {
          throw new Error(
            "This platform model is still used by agents or existing sessions. Select a replacement model before deleting it.",
          );
        }
        if (replacementPlatformModelId === platformModelId) {
          throw new Error("Replacement platform model must be different from the deleted model.");
        }

        const [replacementPlatformModel] = await tx
          .select({
            id: platformModels.id,
            isAvailable: platformModels.isAvailable,
          })
          .from(platformModels)
          .where(eq(platformModels.id, replacementPlatformModelId)) as Array<{
            id: string;
            isAvailable: boolean;
          }>;
        if (!replacementPlatformModel) {
          throw new Error("Replacement platform model not found.");
        }
        if (!replacementPlatformModel.isAvailable) {
          throw new Error("Replacement platform model must be available.");
        }

        const [replacementRouteRecord] = await tx
          .select({
            platformModelProviderCredentialModelId: platformModelRoutes.platformModelProviderCredentialModelId,
          })
          .from(platformModelRoutes)
          .where(eq(platformModelRoutes.platformModelId, replacementPlatformModelId)) as Array<{
            platformModelProviderCredentialModelId: string;
          }>;
        if (!replacementRouteRecord) {
          throw new Error("Replacement platform model must have at least one route.");
        }

        const replacementRouteCredentialModelId = replacementRouteRecord.platformModelProviderCredentialModelId;
        const now = new Date();
        if (affectedAgentRecords.length > 0) {
          await tx
            .update(agents)
            .set({
              defaultPlatformModelId: replacementPlatformModelId,
              updated_at: now,
            })
            .where(eq(agents.defaultPlatformModelId, platformModelId));
        }
        if (affectedSessionRecords.length > 0) {
          await tx
            .update(agentSessions)
            .set({
              currentPlatformModelId: replacementPlatformModelId,
              currentPlatformModelProviderCredentialModelId: replacementRouteCredentialModelId,
              updated_at: now,
            })
            .where(eq(agentSessions.currentPlatformModelId, platformModelId));
        }
      }

      await tx
        .delete(platformModels)
        .where(eq(platformModels.id, platformModelId));

      return {
        ...platformModel,
        agentCount: affectedAgentRecords.length,
        routeCount: 0,
        sessionCount: affectedSessionRecords.length,
      };
    });
  };
}
