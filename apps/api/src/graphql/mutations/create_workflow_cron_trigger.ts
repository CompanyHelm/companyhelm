import { inject, injectable } from "inversify";
import { WorkflowSchedulerSyncService } from "../../services/workflows/scheduler_sync.ts";
import { WorkflowService } from "../../services/workflows/service.ts";
import type { WorkflowRunInputValue } from "../../services/workflows/types.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  WorkflowGraphqlPresenter,
  type GraphqlWorkflowCronTriggerRecord,
} from "../workflow_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type CreateWorkflowCronTriggerMutationArguments = {
  input: {
    agentId: string;
    cronPattern: string;
    enabled?: boolean | null;
    inputValues: WorkflowRunInputValue[];
    timezone: string;
    workflowDefinitionId: string;
  };
};

/**
 * Adds one cron schedule to a workflow and immediately reconciles BullMQ so the schedule becomes
 * active without waiting for the next API process restart.
 */
@injectable()
export class CreateWorkflowCronTriggerMutation
  extends Mutation<CreateWorkflowCronTriggerMutationArguments, GraphqlWorkflowCronTriggerRecord>
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
    arguments_: CreateWorkflowCronTriggerMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlWorkflowCronTriggerRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const trigger = await this.workflowService.createCronTrigger(context.app_runtime_transaction_provider, {
      agentId: arguments_.input.agentId,
      companyId: context.authSession.company.id,
      cronPattern: arguments_.input.cronPattern,
      enabled: arguments_.input.enabled,
      inputValues: arguments_.input.inputValues,
      timezone: arguments_.input.timezone,
      workflowDefinitionId: arguments_.input.workflowDefinitionId,
    });
    const schedule = await this.workflowService.getCronTriggerSchedule(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      trigger.id,
    );
    await this.workflowSchedulerSyncService.syncCronTrigger(schedule, trigger.id);

    return this.presenter.serializeCronTrigger(trigger);
  };
}
