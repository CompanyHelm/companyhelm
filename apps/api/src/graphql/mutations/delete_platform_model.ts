import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { platformModels } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeletePlatformModelMutationArguments = {
  input: {
    id: string;
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
    if (!context.authSession?.user?.isPlatformAdmin) {
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

      await tx
        .delete(platformModels)
        .where(eq(platformModels.id, platformModelId));

      return {
        ...platformModel,
        routeCount: 0,
      };
    });
  };
}
