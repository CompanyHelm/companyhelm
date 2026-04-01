import { inject, injectable } from "inversify";
import { ArtifactService } from "../../services/artifact_service.ts";
import { GraphqlArtifactPresenter, type GraphqlArtifactRecord } from "../artifact_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteArtifactMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Deletes one artifact permanently so users can remove stale company documents without leaving an
 * archived record in the primary knowledge-base UI.
 */
@injectable()
export class DeleteArtifactMutation extends Mutation<DeleteArtifactMutationArguments, GraphqlArtifactRecord> {
  private readonly artifactService: ArtifactService;

  constructor(@inject(ArtifactService) artifactService: ArtifactService = new ArtifactService()) {
    super();
    this.artifactService = artifactService;
  }

  protected resolve = async (
    arguments_: DeleteArtifactMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlArtifactRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const artifact = await this.artifactService.deleteArtifact(context.app_runtime_transaction_provider, {
      artifactId: arguments_.input.id,
      companyId: context.authSession.company.id,
    });

    return GraphqlArtifactPresenter.present(artifact);
  };
}
