import { inject, injectable } from "inversify";
import { ArtifactService } from "../../services/artifact_service.ts";
import { GraphqlArtifactPresenter, type GraphqlArtifactRecord } from "../artifact_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type ArchiveArtifactMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Archives one artifact so stale deliverables can leave the active UI without deleting their
 * historical record or breaking later references.
 */
@injectable()
export class ArchiveArtifactMutation extends Mutation<ArchiveArtifactMutationArguments, GraphqlArtifactRecord> {
  private readonly artifactService: ArtifactService;

  constructor(@inject(ArtifactService) artifactService: ArtifactService = new ArtifactService()) {
    super();
    this.artifactService = artifactService;
  }

  protected resolve = async (
    arguments_: ArchiveArtifactMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlArtifactRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const artifact = await this.artifactService.archiveArtifact(context.app_runtime_transaction_provider, {
      artifactId: arguments_.input.id,
      companyId: context.authSession.company.id,
      updatedByUserId: context.authSession.user.id,
    });

    return GraphqlArtifactPresenter.present(artifact);
  };
}
