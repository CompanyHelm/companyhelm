import { inject, injectable } from "inversify";
import {
  PlatformModelCatalogService,
  type PlatformModelCatalogRecord,
} from "../../services/ai_providers/platform_model_catalog_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreatePlatformModelMutationArguments = {
  input: {
    description?: string | null;
    isDefault?: boolean | null;
    modelId: string;
    modelProvider: string;
    name?: string | null;
    reasoningLevels?: string[] | null;
    reasoningSupported?: boolean | null;
  };
};

/**
 * Creates an inactive product-facing platform model without routes. This supports staging a model
 * in the admin catalog before any concrete credential model is attached for runtime use.
 */
@injectable()
export class CreatePlatformModelMutation extends Mutation<
  CreatePlatformModelMutationArguments,
  PlatformModelCatalogRecord
> {
  private readonly platformModelCatalogService: PlatformModelCatalogService;

  constructor(
    @inject(PlatformModelCatalogService)
    platformModelCatalogService: PlatformModelCatalogService = new PlatformModelCatalogService(),
  ) {
    super();
    this.platformModelCatalogService = platformModelCatalogService;
  }

  protected resolve = async (
    arguments_: CreatePlatformModelMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<PlatformModelCatalogRecord> => {
    this.assertPlatformAdmin(context);
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }

    return this.platformModelCatalogService.createManualModel({
      ...arguments_.input,
      transactionProvider,
    });
  };

  private assertPlatformAdmin(context: GraphqlRequestContext): void {
    if (!context.authSession?.user?.isPlatformAdmin) {
      throw new Error("Platform admin access required.");
    }
  }
}
