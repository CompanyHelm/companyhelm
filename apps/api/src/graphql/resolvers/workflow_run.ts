import { inject, injectable } from "inversify";
import { WorkflowService } from "../../services/workflows/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  WorkflowGraphqlPresenter,
  type GraphqlWorkflowRunRecord,
} from "../workflow_graphql_presenter.ts";

type WorkflowRunQueryResolverArguments = {
  id: string;
};

/**
 * Reads one workflow run and its runtime step snapshots. UI progress is derived from the run's
 * `runningStepRunId` plus each step ordinal rather than a separate step status column.
 */
@injectable()
export class WorkflowRunQueryResolver {
  constructor(
    @inject(WorkflowService) private readonly workflowService: WorkflowService,
    @inject(WorkflowGraphqlPresenter)
    private readonly presenter: WorkflowGraphqlPresenter = new WorkflowGraphqlPresenter(),
  ) {
  }

  execute = async (
    _root: unknown,
    arguments_: WorkflowRunQueryResolverArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlWorkflowRunRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const run = await this.workflowService.getWorkflowRun(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.id,
    );
    return this.presenter.serializeRun(run);
  };
}
