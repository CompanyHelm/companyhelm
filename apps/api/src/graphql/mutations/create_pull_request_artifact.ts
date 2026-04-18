import { inject, injectable } from "inversify";
import type {
  ArtifactPullRequestProvider,
  ArtifactScope,
  ArtifactState,
} from "../../services/artifact_service.ts";
import { ArtifactService } from "../../services/artifact_service.ts";
import { GraphqlArtifactPresenter, type GraphqlArtifactRecord } from "../artifact_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreatePullRequestArtifactMutationArguments = {
  input: {
    description?: string | null;
    name: string;
    provider?: string | null;
    pullRequestNumber?: number | null;
    repository?: string | null;
    scopeType: string;
    sessionId?: string | null;
    state?: string | null;
    taskId?: string | null;
    url: string;
  };
};

/**
 * Creates one pull-request artifact so GitHub review targets can be persisted as typed deliverables
 * attached to the company, a specific task, or the session that produced them.
 */
@injectable()
export class CreatePullRequestArtifactMutation extends Mutation<
  CreatePullRequestArtifactMutationArguments,
  GraphqlArtifactRecord
> {
  private readonly artifactService: ArtifactService;

  constructor(@inject(ArtifactService) artifactService: ArtifactService = new ArtifactService()) {
    super();
    this.artifactService = artifactService;
  }

  protected resolve = async (
    arguments_: CreatePullRequestArtifactMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlArtifactRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const artifact = await this.artifactService.createPullRequestArtifact(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      createdByUserId: context.authSession.user.id,
      description: arguments_.input.description,
      name: arguments_.input.name,
      provider: arguments_.input.provider as ArtifactPullRequestProvider | null | undefined,
      pullRequestNumber: arguments_.input.pullRequestNumber,
      repository: arguments_.input.repository,
      scopeType: arguments_.input.scopeType as ArtifactScope,
      sessionId: arguments_.input.sessionId,
      state: arguments_.input.state as ArtifactState | null | undefined,
      taskId: arguments_.input.taskId,
      url: arguments_.input.url,
    });

    return GraphqlArtifactPresenter.present(artifact);
  };
}
