import { inject, injectable } from "inversify";
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

type ModelProviderAvailabilityService = {
  hasRuntimeApiKey(): boolean;
};

/**
 * Exposes the supported model providers and their authorization requirements so the web UI can
 * render the credential setup flow without duplicating provider-specific copy.
 */
@injectable()
export class ModelProvidersQueryResolver extends Resolver<GraphqlModelProviderRecord[]> {
  private readonly modelProviderService: ModelProviderService;
  private readonly companyHelmLlmProviderService: ModelProviderAvailabilityService;

  constructor(
    @inject(ModelProviderService) modelProviderService: ModelProviderService = new ModelProviderService(),
    @inject(CompanyHelmLlmProviderService)
    companyHelmLlmProviderService: ModelProviderAvailabilityService =
      ModelProvidersQueryResolver.createUnavailableCompanyHelmProviderService(),
  ) {
    super();
    this.modelProviderService = modelProviderService;
    this.companyHelmLlmProviderService = companyHelmLlmProviderService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<GraphqlModelProviderRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }

    return this.modelProviderService.list().map((provider) => ({
      authorizationInstructionsMarkdown: provider.authorizationInstructionsMarkdown,
      id: provider.id,
      isAvailable: provider.id === CompanyHelmLlmProviderService.PROVIDER_ID
        ? this.companyHelmLlmProviderService.hasRuntimeApiKey()
        : true,
      name: provider.name,
      type: provider.type,
    }));
  };

  private static createUnavailableCompanyHelmProviderService(): ModelProviderAvailabilityService {
    return {
      hasRuntimeApiKey: () => false,
    };
  }
}
