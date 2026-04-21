import { inject, injectable } from "inversify";
import { WorkflowSchedulerSyncService } from "../../services/workflows/scheduler_sync.ts";
import { WorkflowService } from "../../services/workflows/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  WorkflowGraphqlPresenter,
  type GraphqlWorkflowCronTriggerRecord,
} from "../workflow_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type DeleteWorkflowTriggerMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Deletes a workflow trigger and removes its BullMQ scheduler so stale cron jobs cannot start
 * workflow runs after the schedule is removed.
 */
@injectable()
export class DeleteWorkflowTriggerMutation
  extends Mutation<DeleteWorkflowTriggerMutationArguments, GraphqlWorkflowCronTriggerRecord>
{
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
    arguments_: DeleteWorkflowTriggerMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlWorkflowCronTriggerRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const trigger = await this.workflowService.deleteTrigger(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.id,
    );
    await this.workflowSchedulerSyncService.removeCronTrigger(trigger.id);

    return this.presenter.serializeCronTrigger(trigger);
  };
}
