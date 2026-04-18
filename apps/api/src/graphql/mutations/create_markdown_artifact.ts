import { inject, injectable } from "inversify";
import type { ArtifactScope, ArtifactState } from "../../services/artifact_service.ts";
import { ArtifactService } from "../../services/artifact_service.ts";
import { GraphqlArtifactPresenter, type GraphqlArtifactRecord } from "../artifact_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreateMarkdownArtifactMutationArguments = {
  input: {
    contentMarkdown: string;
    description?: string | null;
    name: string;
    scopeType: string;
    sessionId?: string | null;
    state?: string | null;
    taskId?: string | null;
  };
};

/**
 * Creates one markdown artifact for company, task, or session scope so PRDs and design docs can be
 * stored as first-class deliverables instead of living only inside task descriptions or transcripts.
 */
@injectable()
export class CreateMarkdownArtifactMutation extends Mutation<
  CreateMarkdownArtifactMutationArguments,
  GraphqlArtifactRecord
> {
  private readonly artifactService: ArtifactService;

  constructor(@inject(ArtifactService) artifactService: ArtifactService = new ArtifactService()) {
    super();
    this.artifactService = artifactService;
  }

  protected resolve = async (
    arguments_: CreateMarkdownArtifactMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlArtifactRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const artifact = await this.artifactService.createMarkdownArtifact(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      contentMarkdown: arguments_.input.contentMarkdown,
      createdByUserId: context.authSession.user.id,
      description: arguments_.input.description,
      name: arguments_.input.name,
      scopeType: arguments_.input.scopeType as ArtifactScope,
      sessionId: arguments_.input.sessionId,
      state: arguments_.input.state as ArtifactState | null | undefined,
      taskId: arguments_.input.taskId,
    });

    return GraphqlArtifactPresenter.present(artifact);
  };
}
