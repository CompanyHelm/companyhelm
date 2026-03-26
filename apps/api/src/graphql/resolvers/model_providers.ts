import { inject, injectable } from "inversify";
import { ModelProviderService } from "../../services/ai_providers/model_provider_service.js";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type GraphqlModelProviderRecord = {
  authorizationInstructionsMarkdown: string | null;
  id: string;
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

    return this.modelProviderService.list().map((provider) => ({
      authorizationInstructionsMarkdown: provider.authorizationInstructionsMarkdown,
      id: provider.id,
      name: provider.name,
      type: provider.type,
    }));
  };
}
