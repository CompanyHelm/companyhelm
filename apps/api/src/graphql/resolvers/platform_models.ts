import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { platformModelRoutes, platformModels } from "../../db/schema.ts";
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
  routeCount: number;
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

      return modelRecords
        .map((modelRecord) => ({
          ...modelRecord,
          routeCount: routeCountByModelId.get(modelRecord.id) ?? 0,
        }))
        .sort((left, right) => left.name.localeCompare(right.name));
    });
  };
}
