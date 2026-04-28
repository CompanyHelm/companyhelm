import { inject, injectable } from "inversify";
import {
  PlatformModelCatalogService,
  type PlatformModelCatalogRecord,
} from "../../services/ai_providers/platform_model_catalog_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdatePlatformModelMutationArguments = {
  input: {
    description?: string | null;
    isAvailable?: boolean | null;
    isDefault?: boolean | null;
    name?: string | null;
    platformModelId: string;
    reasoningLevels?: string[] | null;
    reasoningSupported?: boolean | null;
  };
};

/**
 * Updates product-facing platform model metadata and availability. Activation remains guarded by
 * route existence so companies never receive an active model PI Mono cannot execute.
 */
@injectable()
export class UpdatePlatformModelMutation extends Mutation<
  UpdatePlatformModelMutationArguments,
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
    arguments_: UpdatePlatformModelMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<PlatformModelCatalogRecord> => {
    this.assertPlatformAdmin(context);
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }

    return this.platformModelCatalogService.updateModel({
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
