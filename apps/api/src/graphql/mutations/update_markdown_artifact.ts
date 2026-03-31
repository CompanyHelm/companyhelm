import { inject, injectable } from "inversify";
import { ArtifactService } from "../../services/artifact_service.ts";
import { GraphqlArtifactPresenter, type GraphqlArtifactRecord } from "../artifact_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateMarkdownArtifactMutationArguments = {
  input: {
    contentMarkdown: string;
    id: string;
  };
};

/**
 * Replaces the markdown body for one markdown artifact while keeping the artifact identity stable.
 */
@injectable()
export class UpdateMarkdownArtifactMutation extends Mutation<
  UpdateMarkdownArtifactMutationArguments,
  GraphqlArtifactRecord
> {
  private readonly artifactService: ArtifactService;

  constructor(@inject(ArtifactService) artifactService: ArtifactService = new ArtifactService()) {
    super();
    this.artifactService = artifactService;
  }

  protected resolve = async (
    arguments_: UpdateMarkdownArtifactMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlArtifactRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const artifact = await this.artifactService.updateMarkdownArtifact(context.app_runtime_transaction_provider, {
      artifactId: arguments_.input.id,
      companyId: context.authSession.company.id,
      contentMarkdown: arguments_.input.contentMarkdown,
      updatedByUserId: context.authSession.user.id,
    });

    return GraphqlArtifactPresenter.present(artifact);
  };
}
