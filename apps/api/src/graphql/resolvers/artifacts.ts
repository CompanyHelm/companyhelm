import { inject, injectable } from "inversify";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { GraphqlArtifactPresenter, type GraphqlArtifactRecord } from "../artifact_presenter.ts";
import { ArtifactService } from "../../services/artifact_service.ts";

type ArtifactsQueryArguments = {
  input: {
    scopeType: string;
    taskId?: string | null;
  };
};

/**
 * Lists artifacts for one scope so the UI can show company-wide docs or the artifact stack for a
 * specific task without duplicating list logic per artifact subtype.
 */
@injectable()
export class ArtifactsQueryResolver {
  private readonly artifactService: ArtifactService;

  constructor(@inject(ArtifactService) artifactService: ArtifactService = new ArtifactService()) {
    this.artifactService = artifactService;
  }

  execute = async (
    _root: unknown,
    arguments_: ArtifactsQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlArtifactRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const artifacts = await this.artifactService.listArtifacts(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      scopeType: arguments_.input.scopeType as "company" | "task",
      taskId: arguments_.input.taskId,
    });

    return artifacts.map((artifact) => GraphqlArtifactPresenter.present(artifact));
  };
}
