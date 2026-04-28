import { and, eq, inArray, notInArray } from "drizzle-orm";
import { injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import {
  platformModelProviderCredentialModels,
  platformModelRoutes,
  platformModels,
} from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type SetPlatformModelRoutesMutationArguments = {
  input: {
    platformModelId: string;
    platformModelProviderCredentialModelIds: string[];
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
  routeCount: number;
  updatedAt: Date;
};

type DatabaseTransaction = {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
  execute?(query: unknown): Promise<unknown>;
  insert(table: unknown): {
    values(value: Record<string, unknown>): Promise<unknown>;
  };
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Replaces the concrete credential-model route set for one platform model. Route existence is the
 * only routing configuration; runtime always round-robins across the healthy route rows.
 */
@injectable()
export class SetPlatformModelRoutesMutation extends Mutation<
  SetPlatformModelRoutesMutationArguments,
  PlatformModelRecord
> {
  protected resolve = async (
    arguments_: SetPlatformModelRoutesMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<PlatformModelRecord> => {
    if (!context.authSession?.user?.isPlatformAdmin) {
      throw new Error("Platform admin access required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    const platformModelId = arguments_.input.platformModelId.trim();
    if (!platformModelId) {
      throw new Error("platformModelId is required.");
    }
    const routeModelIds = [...new Set(arguments_.input.platformModelProviderCredentialModelIds)]
      .filter((id) => id.trim().length > 0);

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const database = tx as unknown as DatabaseTransaction;
      const [platformModelRecord] = await database
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
      if (!platformModelRecord) {
        throw new Error("Platform model not found.");
      }

      if (routeModelIds.length > 0) {
        const credentialModelRecords = await database
          .select({
            id: platformModelProviderCredentialModels.id,
          })
          .from(platformModelProviderCredentialModels)
          .where(inArray(platformModelProviderCredentialModels.id, routeModelIds)) as Array<{
            id: string;
          }>;
        if (credentialModelRecords.length !== routeModelIds.length) {
          throw new Error("One or more credential models were not found.");
        }
      }

      if (routeModelIds.length === 0) {
        await database
          .delete(platformModelRoutes)
          .where(eq(platformModelRoutes.platformModelId, platformModelId));
      } else {
        await database
          .delete(platformModelRoutes)
          .where(and(
            eq(platformModelRoutes.platformModelId, platformModelId),
            notInArray(platformModelRoutes.platformModelProviderCredentialModelId, routeModelIds),
          ));
      }

      const existingRouteRecords = await database
        .select({
          platformModelProviderCredentialModelId: platformModelRoutes.platformModelProviderCredentialModelId,
        })
        .from(platformModelRoutes)
        .where(eq(platformModelRoutes.platformModelId, platformModelId)) as Array<{
          platformModelProviderCredentialModelId: string;
        }>;
      const existingRouteModelIds = new Set(
        existingRouteRecords.map((routeRecord) => routeRecord.platformModelProviderCredentialModelId),
      );
      const now = new Date();
      for (const routeModelId of routeModelIds) {
        if (existingRouteModelIds.has(routeModelId)) {
          continue;
        }

        await database
          .insert(platformModelRoutes)
          .values({
            createdAt: now,
            platformModelId,
            platformModelProviderCredentialModelId: routeModelId,
            updatedAt: now,
          });
      }

      return {
        ...platformModelRecord,
        routeCount: routeModelIds.length,
      };
    });
  };
}
