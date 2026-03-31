import { inject, injectable } from "inversify";
import { ArtifactService } from "../../services/artifact_service.ts";
import { GraphqlArtifactPresenter, type GraphqlArtifactRecord } from "../artifact_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateExternalLinkArtifactMutationArguments = {
  input: {
    id: string;
    url: string;
  };
};

/**
 * Replaces the URL for one external-link artifact while keeping the artifact identity stable.
 */
@injectable()
export class UpdateExternalLinkArtifactMutation extends Mutation<
  UpdateExternalLinkArtifactMutationArguments,
  GraphqlArtifactRecord
> {
  private readonly artifactService: ArtifactService;

  constructor(@inject(ArtifactService) artifactService: ArtifactService = new ArtifactService()) {
    super();
    this.artifactService = artifactService;
  }

  protected resolve = async (
    arguments_: UpdateExternalLinkArtifactMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlArtifactRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const artifact = await this.artifactService.updateExternalLinkArtifact(context.app_runtime_transaction_provider, {
      artifactId: arguments_.input.id,
      companyId: context.authSession.company.id,
      updatedByUserId: context.authSession.user.id,
      url: arguments_.input.url,
    });

    return GraphqlArtifactPresenter.present(artifact);
  };
}
