import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { imageProviderCredentialModels } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type SetDefaultImageProviderCredentialModelMutationArguments = {
  input: {
    id: string;
  };
};

type ImageProviderCredentialModelRecord = {
  description: string;
  id: string;
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  name: string;
  outputMimeTypes: string[];
  supportedQualities: string[];
  supportedSizes: string[];
  supportsEditing: boolean;
  supportsFlexibleSizes: boolean;
  supportsTransparentBackground: boolean;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<void>;
    };
  };
};

/**
 * Promotes one stored image model row to be the default image generation model within its
 * credential.
 */
@injectable()
export class SetDefaultImageProviderCredentialModelMutation extends Mutation<
  SetDefaultImageProviderCredentialModelMutationArguments,
  ImageProviderCredentialModelRecord
> {
  protected resolve = async (
    arguments_: SetDefaultImageProviderCredentialModelMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<ImageProviderCredentialModelRecord> => {
    const modelRowId = String(arguments_.input.id || "").trim();
    if (!modelRowId) {
      throw new Error("id is required.");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    const companyId = context.authSession.company.id;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const updatableDatabase = tx as unknown as UpdatableDatabase;
      const [model] = await selectableDatabase
        .select({
          description: imageProviderCredentialModels.description,
          id: imageProviderCredentialModels.id,
          isDefault: imageProviderCredentialModels.isDefault,
          modelId: imageProviderCredentialModels.modelId,
          modelProviderCredentialId: imageProviderCredentialModels.modelProviderCredentialId,
          name: imageProviderCredentialModels.name,
          outputMimeTypes: imageProviderCredentialModels.outputMimeTypes,
          supportedQualities: imageProviderCredentialModels.supportedQualities,
          supportedSizes: imageProviderCredentialModels.supportedSizes,
          supportsEditing: imageProviderCredentialModels.supportsEditing,
          supportsFlexibleSizes: imageProviderCredentialModels.supportsFlexibleSizes,
          supportsTransparentBackground: imageProviderCredentialModels.supportsTransparentBackground,
        })
        .from(imageProviderCredentialModels)
        .where(and(
          eq(imageProviderCredentialModels.companyId, companyId),
          eq(imageProviderCredentialModels.id, modelRowId),
        )) as ImageProviderCredentialModelRecord[];
      if (!model) {
        throw new Error("Image credential model not found.");
      }

      await updatableDatabase.update(imageProviderCredentialModels).set({ isDefault: false }).where(and(
        eq(imageProviderCredentialModels.companyId, companyId),
        eq(imageProviderCredentialModels.modelProviderCredentialId, model.modelProviderCredentialId),
      ));
      await updatableDatabase.update(imageProviderCredentialModels).set({ isDefault: true }).where(and(
        eq(imageProviderCredentialModels.companyId, companyId),
        eq(imageProviderCredentialModels.id, model.id),
      ));

      return {
        ...model,
        isDefault: true,
        outputMimeTypes: [...model.outputMimeTypes],
        supportedQualities: [...model.supportedQualities],
        supportedSizes: [...model.supportedSizes],
      };
    });
  };
}
