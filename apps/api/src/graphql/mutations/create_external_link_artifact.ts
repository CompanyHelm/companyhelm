import { inject, injectable } from "inversify";
import type { ArtifactScope, ArtifactState } from "../../services/artifact_service.ts";
import { ArtifactService } from "../../services/artifact_service.ts";
import { SessionArtifactUpdatePublisher } from "../../services/agent/session/process/artifact_update_publisher.ts";
import { GraphqlArtifactPresenter, type GraphqlArtifactRecord } from "../artifact_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreateExternalLinkArtifactMutationArguments = {
  input: {
    description?: string | null;
    name: string;
    scopeType: string;
    sessionId?: string | null;
    state?: string | null;
    taskId?: string | null;
    url: string;
  };
};

/**
 * Creates one external-link artifact so durable reference links can be attached to company, task,
 * or session scope and rendered in the web UI outside the raw agent transcript.
 */
@injectable()
export class CreateExternalLinkArtifactMutation extends Mutation<
  CreateExternalLinkArtifactMutationArguments,
  GraphqlArtifactRecord
> {
  private readonly artifactService: ArtifactService;
  private readonly sessionArtifactUpdatePublisher: SessionArtifactUpdatePublisher;

  constructor(
    @inject(ArtifactService) artifactService: ArtifactService = new ArtifactService(),
    @inject(SessionArtifactUpdatePublisher)
    sessionArtifactUpdatePublisher: SessionArtifactUpdatePublisher = new SessionArtifactUpdatePublisher(),
  ) {
    super();
    this.artifactService = artifactService;
    this.sessionArtifactUpdatePublisher = sessionArtifactUpdatePublisher;
  }

  protected resolve = async (
    arguments_: CreateExternalLinkArtifactMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlArtifactRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const artifact = await this.artifactService.createExternalLinkArtifact(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      createdByUserId: context.authSession.user.id,
      description: arguments_.input.description,
      name: arguments_.input.name,
      scopeType: arguments_.input.scopeType as ArtifactScope,
      sessionId: arguments_.input.sessionId,
      state: arguments_.input.state as ArtifactState | null | undefined,
      taskId: arguments_.input.taskId,
      url: arguments_.input.url,
    });

    await this.sessionArtifactUpdatePublisher.publish(context.authSession.company.id, artifact.sessionId);

    return GraphqlArtifactPresenter.present(artifact);
  };
}
