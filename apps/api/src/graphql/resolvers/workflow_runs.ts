import { inject, injectable } from "inversify";
import { WorkflowService } from "../../services/workflows/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  WorkflowGraphqlPresenter,
  type GraphqlWorkflowRunRecord,
} from "../workflow_graphql_presenter.ts";

type WorkflowRunsQueryResolverArguments = {
  workflowDefinitionId: string;
};

/**
 * Lists recent runs for a single workflow definition so the workflow detail page can render run
 * history without fetching each run independently.
 */
@injectable()
export class WorkflowRunsQueryResolver {
  constructor(
    @inject(WorkflowService) private readonly workflowService: WorkflowService,
    @inject(WorkflowGraphqlPresenter)
    private readonly presenter: WorkflowGraphqlPresenter = new WorkflowGraphqlPresenter(),
  ) {
  }

  execute = async (
    _root: unknown,
    arguments_: WorkflowRunsQueryResolverArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlWorkflowRunRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const runs = await this.workflowService.listWorkflowRuns(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.workflowDefinitionId,
    );
    return runs.map((run) => this.presenter.serializeRun(run));
  };
}
