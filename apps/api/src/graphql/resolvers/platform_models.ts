import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { agentSessions, agents, platformModelRoutes, platformModels } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

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

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Lists stable platform models exposed to companies. These are product-facing model records; the
 * concrete credential routing is managed separately on the model detail page.
 */
@injectable()
export class PlatformModelsQueryResolver {
  execute = async (
    _root: unknown,
    _arguments: unknown,
    context: GraphqlRequestContext,
  ): Promise<PlatformModelRecord[]> => {
    if (!context.authSession?.user?.isPlatformAdmin) {
      throw new Error("Platform admin access required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const modelRecords = await selectableDatabase
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
        .where(eq(platformModels.id, platformModels.id)) as Array<Omit<PlatformModelRecord, "routeCount">>;
      const routeRecords = await selectableDatabase
        .select({
          platformModelId: platformModelRoutes.platformModelId,
        })
        .from(platformModelRoutes)
        .where(eq(platformModelRoutes.platformModelId, platformModelRoutes.platformModelId)) as Array<{
          platformModelId: string;
        }>;
      const routeCountByModelId = new Map<string, number>();
      for (const routeRecord of routeRecords) {
        routeCountByModelId.set(
          routeRecord.platformModelId,
          (routeCountByModelId.get(routeRecord.platformModelId) ?? 0) + 1,
        );
      }
      const agentRecords = await selectableDatabase
        .select({
          defaultPlatformModelId: agents.defaultPlatformModelId,
        })
        .from(agents)
        .where(eq(agents.defaultModelCredentialSource, "platform")) as Array<{
          defaultPlatformModelId: string | null;
        }>;
      const agentCountByModelId = new Map<string, number>();
      for (const agentRecord of agentRecords) {
        if (!agentRecord.defaultPlatformModelId) {
          continue;
        }

        agentCountByModelId.set(
          agentRecord.defaultPlatformModelId,
          (agentCountByModelId.get(agentRecord.defaultPlatformModelId) ?? 0) + 1,
        );
      }
      const sessionRecords = await selectableDatabase
        .select({
          currentPlatformModelId: agentSessions.currentPlatformModelId,
        })
        .from(agentSessions)
        .where(eq(agentSessions.currentModelCredentialSource, "platform")) as Array<{
          currentPlatformModelId: string | null;
        }>;
      const sessionCountByModelId = new Map<string, number>();
      for (const sessionRecord of sessionRecords) {
        if (!sessionRecord.currentPlatformModelId) {
          continue;
        }

        sessionCountByModelId.set(
          sessionRecord.currentPlatformModelId,
          (sessionCountByModelId.get(sessionRecord.currentPlatformModelId) ?? 0) + 1,
        );
      }

      return modelRecords
        .map((modelRecord) => ({
          ...modelRecord,
          agentCount: agentCountByModelId.get(modelRecord.id) ?? 0,
          routeCount: routeCountByModelId.get(modelRecord.id) ?? 0,
          sessionCount: sessionCountByModelId.get(modelRecord.id) ?? 0,
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    });
  };
}
