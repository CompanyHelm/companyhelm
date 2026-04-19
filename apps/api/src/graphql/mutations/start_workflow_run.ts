import { inject, injectable } from "inversify";
import { WorkflowService } from "../../services/workflows/service.ts";
import type { WorkflowRunInputValue } from "../../services/workflows/types.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  WorkflowGraphqlPresenter,
  type GraphqlWorkflowRunRecord,
} from "../workflow_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type StartWorkflowRunMutationArguments = {
  input: {
    agentId: string;
    inputValues: WorkflowRunInputValue[];
    workflowDefinitionId: string;
  };
};

/**
 * Starts a workflow run by resolving launch inputs into templates, snapshotting definition steps
 * into `workflow_run_steps`, and waking the existing agent-session processing pipeline.
 */
@injectable()
export class StartWorkflowRunMutation extends Mutation<StartWorkflowRunMutationArguments, GraphqlWorkflowRunRecord> {
  constructor(
    @inject(WorkflowService) private readonly workflowService: WorkflowService,
    @inject(WorkflowGraphqlPresenter)
    private readonly presenter: WorkflowGraphqlPresenter = new WorkflowGraphqlPresenter(),
  ) {
    super();
  }

  protected resolve = async (
    arguments_: StartWorkflowRunMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlWorkflowRunRecord> => {
    if (!context.authSession?.company || !context.authSession.user || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const run = await this.workflowService.startWorkflowRun(context.app_runtime_transaction_provider, {
      agentId: arguments_.input.agentId,
      companyId: context.authSession.company.id,
      inputValues: arguments_.input.inputValues,
      startedByUserId: context.authSession.user.id,
      workflowDefinitionId: arguments_.input.workflowDefinitionId,
    });
    return this.presenter.serializeRun(run);
  };
}
