import { inject, injectable } from "inversify";
import { WorkflowService } from "../../services/workflows/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  WorkflowGraphqlPresenter,
  type GraphqlWorkflowRecord,
} from "../workflow_graphql_presenter.ts";

type WorkflowQueryResolverArguments = {
  id: string;
};

/**
 * Loads one workflow definition for detail views and launch flows that need the full input/step
 * snapshot before starting a run.
 */
@injectable()
export class WorkflowQueryResolver {
  constructor(
    @inject(WorkflowService) private readonly workflowService: WorkflowService,
    @inject(WorkflowGraphqlPresenter)
    private readonly presenter: WorkflowGraphqlPresenter = new WorkflowGraphqlPresenter(),
  ) {
  }

  execute = async (
    _root: unknown,
    arguments_: WorkflowQueryResolverArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlWorkflowRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const workflow = await this.workflowService.getWorkflow(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.id,
    );
    return this.presenter.serializeWorkflow(workflow);
  };
}
