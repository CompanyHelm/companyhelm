import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { platformModelRoutes } from "../../db/schema.ts";
import { CompanyHelmLlmProviderService } from "../../services/ai_providers/companyhelm_service.ts";
import { ModelProviderService } from "../../services/ai_providers/model_provider_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type GraphqlModelProviderRecord = {
  authorizationInstructionsMarkdown: string | null;
  id: string;
  isAvailable: boolean;
  name: string;
  type: string;
};

/**
 * Exposes the supported model providers and their authorization requirements so the web UI can
 * render the credential setup flow without duplicating provider-specific copy.
 */
@injectable()
export class ModelProvidersQueryResolver extends Resolver<GraphqlModelProviderRecord[]> {
  private readonly modelProviderService: ModelProviderService;

  constructor(
    @inject(ModelProviderService) modelProviderService: ModelProviderService = new ModelProviderService(),
  ) {
    super();
    this.modelProviderService = modelProviderService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlModelProviderRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    const isCompanyHelmAvailable = await this.isCompanyHelmAvailable(context);

    return this.modelProviderService.list().map((provider) => ({
      authorizationInstructionsMarkdown: provider.authorizationInstructionsMarkdown,
      id: provider.id,
      isAvailable: provider.id === CompanyHelmLlmProviderService.PROVIDER_ID
        ? isCompanyHelmAvailable
        : true,
      name: provider.name,
      type: provider.type,
    }));
  };

  private async isCompanyHelmAvailable(context: GraphqlRequestContext): Promise<boolean> {
    if (!context.app_runtime_transaction_provider) {
      return false;
    }

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const [route] = await tx
        .select({
          id: platformModelRoutes.id,
        })
        .from(platformModelRoutes)
        .where(eq(platformModelRoutes.platformModelId, platformModelRoutes.platformModelId))
        .limit(1);

      return Boolean(route);
    });
  }
}
