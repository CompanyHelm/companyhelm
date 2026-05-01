import { inject, injectable } from "inversify";
import {
  PlatformModelCatalogService,
  type PlatformModelCatalogRecord,
} from "../../services/ai_providers/platform_model_catalog_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type ImportPlatformModelMutationArguments = {
  input: {
    isDefault?: boolean | null;
    modelProvider?: string | null;
    platformModelProviderCredentialModelId: string;
  };
};

/**
 * Publishes a discovered platform credential model into the product-facing catalog and attaches
 * the selected credential model as the first concrete runtime route.
 */
@injectable()
export class ImportPlatformModelMutation extends Mutation<
  ImportPlatformModelMutationArguments,
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
    arguments_: ImportPlatformModelMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<PlatformModelCatalogRecord> => {
    this.assertPlatformAdmin(context);
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }

    return this.platformModelCatalogService.importCredentialModel({
      ...arguments_.input,
      transactionProvider,
    });
  };

  private assertPlatformAdmin(context: GraphqlRequestContext): void {
    if (context.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }
  }
}
