import { inject, injectable } from "inversify";
import { WorkflowSchedulerSyncService } from "../../services/workflows/scheduler_sync.ts";
import { WorkflowService } from "../../services/workflows/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  WorkflowGraphqlPresenter,
  type GraphqlWorkflowRecord,
} from "../workflow_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type DeleteWorkflowMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Deletes a workflow definition and removes cron schedulers for all schedules owned by that
 * definition so BullMQ cannot continue launching runs after the workflow is gone.
 */
@injectable()
export class DeleteWorkflowMutation extends Mutation<DeleteWorkflowMutationArguments, GraphqlWorkflowRecord> {
  constructor(
    @inject(WorkflowService) private readonly workflowService: WorkflowService,
    @inject(WorkflowSchedulerSyncService)
    private readonly workflowSchedulerSyncService: WorkflowSchedulerSyncService,
    @inject(WorkflowGraphqlPresenter)
    private readonly presenter: WorkflowGraphqlPresenter = new WorkflowGraphqlPresenter(),
  ) {
    super();
  }

  protected resolve = async (
    arguments_: DeleteWorkflowMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlWorkflowRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.id.length === 0) {
      throw new Error("id is required.");
    }

    const workflow = await this.workflowService.deleteWorkflow(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.id,
    );
    for (const trigger of workflow.triggers) {
      await this.workflowSchedulerSyncService.removeCronTrigger(trigger.id);
    }

    return this.presenter.serializeWorkflow(workflow);
  };
}
