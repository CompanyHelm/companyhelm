import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlArtifactPresenter, type GraphqlArtifactRecord } from "../artifact_presenter.ts";
import { ArtifactService } from "../../services/artifact_service.ts";

type ArtifactQueryArguments = {
  id: string;
};

/**
 * Loads one company-scoped artifact so the UI can render a full markdown document or linked
 * resource view without loading the entire artifact list first.
 */
@injectable()
export class ArtifactQueryResolver {
  private readonly artifactService: ArtifactService;

  constructor(@inject(ArtifactService) artifactService: ArtifactService = new ArtifactService()) {
    this.artifactService = artifactService;
  }

  execute = async (
    _root: unknown,
    arguments_: ArtifactQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlArtifactRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const artifact = await this.artifactService.getArtifact(context.app_runtime_transaction_provider, {
      artifactId: arguments_.id,
      companyId: context.authSession.company.id,
    });

    return GraphqlArtifactPresenter.present(artifact);
  };
}
