import { inject, injectable } from "inversify";
import { WorkflowService } from "../../services/workflows/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  WorkflowGraphqlPresenter,
  type GraphqlWorkflowRecord,
} from "../workflow_graphql_presenter.ts";

/**
 * Lists all workflow definitions in the authenticated company with their input and ordered step
 * definitions so the management page can render without per-row follow-up queries.
 */
@injectable()
export class WorkflowsQueryResolver {
  constructor(
    @inject(WorkflowService) private readonly workflowService: WorkflowService,
    @inject(WorkflowGraphqlPresenter)
    private readonly presenter: WorkflowGraphqlPresenter = new WorkflowGraphqlPresenter(),
  ) {
  }

  execute = async (
    _root: unknown,
    _arguments: Record<string, never>,
    context: GraphqlRequestContext,
  ): Promise<GraphqlWorkflowRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const workflows = await this.workflowService.listWorkflows(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
    );
    return workflows.map((workflow) => this.presenter.serializeWorkflow(workflow));
  };
}
