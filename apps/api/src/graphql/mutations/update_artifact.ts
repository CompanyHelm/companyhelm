import { inject, injectable } from "inversify";
import type { ArtifactState } from "../../services/artifact_service.ts";
import { ArtifactService } from "../../services/artifact_service.ts";
import { GraphqlArtifactPresenter, type GraphqlArtifactRecord } from "../artifact_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateArtifactMutationArguments = {
  input: {
    description?: string | null;
    id: string;
    name?: string | null;
    state?: string | null;
  };
};

/**
 * Updates the shared metadata for one artifact while leaving the subtype-specific payload in place.
 */
@injectable()
export class UpdateArtifactMutation extends Mutation<UpdateArtifactMutationArguments, GraphqlArtifactRecord> {
  private readonly artifactService: ArtifactService;

  constructor(@inject(ArtifactService) artifactService: ArtifactService = new ArtifactService()) {
    super();
    this.artifactService = artifactService;
  }

  protected resolve = async (
    arguments_: UpdateArtifactMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlArtifactRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const artifact = await this.artifactService.updateArtifactMetadata(context.app_runtime_transaction_provider, {
      artifactId: arguments_.input.id,
      companyId: context.authSession.company.id,
      description: arguments_.input.description,
      name: arguments_.input.name,
      state: arguments_.input.state as ArtifactState | null | undefined,
      updatedByUserId: context.authSession.user.id,
    });

    return GraphqlArtifactPresenter.present(artifact);
  };
}
