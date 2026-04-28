import { eq } from "drizzle-orm";
import { injectable } from "inversify";
import { PlatformLlmCredentialAccess } from "../../db/platform_llm_credential_access.ts";
import {
  platformModelProviderCredentialModels,
  platformModelProviderCredentials,
  platformModelRoutes,
} from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type PlatformModelRouteRecord = {
  createdAt: Date;
  id: string;
  platformModelId: string;
  platformModelProviderCredentialModel: {
    id: string;
    isAvailable: boolean;
    modelId: string;
    name: string;
    platformModelProviderCredential: {
      id: string;
      name: string;
      modelProvider: string;
      status: string;
    };
  };
  platformModelProviderCredentialModelId: string;
  updatedAt: Date;
};

type SelectableDatabase = {
  execute?(query: unknown): Promise<unknown>;
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Loads the concrete credential-model routes for one stable platform model so the admin UI can
 * define which credentials are eligible for hardcoded round-robin runtime selection.
 */
@injectable()
export class PlatformModelRoutesQueryResolver {
  execute = async (
    _root: unknown,
    arguments_: { platformModelId: string },
    context: GraphqlRequestContext,
  ): Promise<PlatformModelRouteRecord[]> => {
    if (!context.authSession?.user?.isPlatformAdmin) {
      throw new Error("Platform admin access required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      await PlatformLlmCredentialAccess.enable(tx);
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const routeRecords = await selectableDatabase
        .select({
          createdAt: platformModelRoutes.createdAt,
          id: platformModelRoutes.id,
          platformModelId: platformModelRoutes.platformModelId,
          platformModelProviderCredentialModelId: platformModelRoutes.platformModelProviderCredentialModelId,
          updatedAt: platformModelRoutes.updatedAt,
        })
        .from(platformModelRoutes)
        .where(eq(platformModelRoutes.platformModelId, arguments_.platformModelId)) as Array<{
          createdAt: Date;
          id: string;
          platformModelId: string;
          platformModelProviderCredentialModelId: string;
          updatedAt: Date;
        }>;

      const output: PlatformModelRouteRecord[] = [];
      for (const routeRecord of routeRecords) {
        const [credentialModelRecord] = await selectableDatabase
          .select({
            id: platformModelProviderCredentialModels.id,
            isAvailable: platformModelProviderCredentialModels.isAvailable,
            modelId: platformModelProviderCredentialModels.modelId,
            name: platformModelProviderCredentialModels.name,
            platformModelProviderCredentialId: platformModelProviderCredentialModels.platformModelProviderCredentialId,
          })
          .from(platformModelProviderCredentialModels)
          .where(eq(
            platformModelProviderCredentialModels.id,
            routeRecord.platformModelProviderCredentialModelId,
          )) as Array<{
            id: string;
            isAvailable: boolean;
            modelId: string;
            name: string;
            platformModelProviderCredentialId: string;
          }>;
        if (!credentialModelRecord) {
          continue;
        }

        const [credentialRecord] = await selectableDatabase
          .select({
            id: platformModelProviderCredentials.id,
            modelProvider: platformModelProviderCredentials.modelProvider,
            name: platformModelProviderCredentials.name,
            status: platformModelProviderCredentials.status,
          })
          .from(platformModelProviderCredentials)
          .where(eq(
            platformModelProviderCredentials.id,
            credentialModelRecord.platformModelProviderCredentialId,
          )) as Array<{
            id: string;
            modelProvider: string;
            name: string;
            status: string;
          }>;
        if (!credentialRecord) {
          continue;
        }

        output.push({
          ...routeRecord,
          platformModelProviderCredentialModel: {
            id: credentialModelRecord.id,
            isAvailable: credentialModelRecord.isAvailable,
            modelId: credentialModelRecord.modelId,
            name: credentialModelRecord.name,
            platformModelProviderCredential: credentialRecord,
          },
        });
      }

      return output.sort((left, right) => {
        const credentialComparison = left.platformModelProviderCredentialModel.platformModelProviderCredential.name
          .localeCompare(right.platformModelProviderCredentialModel.platformModelProviderCredential.name);
        if (credentialComparison !== 0) {
          return credentialComparison;
        }

        return left.platformModelProviderCredentialModel.name
          .localeCompare(right.platformModelProviderCredentialModel.name);
      });
    });
  };
}
