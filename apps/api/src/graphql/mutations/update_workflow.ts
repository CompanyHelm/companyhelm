import { inject, injectable } from "inversify";
import { WorkflowService } from "../../services/workflows/service.ts";
import type { WorkflowInputDraft, WorkflowStepDraft } from "../../services/workflows/types.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  WorkflowGraphqlPresenter,
  type GraphqlWorkflowRecord,
} from "../workflow_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type UpdateWorkflowMutationArguments = {
  input: {
    description?: string | null;
    id: string;
    inputs?: WorkflowInputDraft[] | null;
    instructions?: string | null;
    isEnabled?: boolean | null;
    name?: string | null;
    steps?: WorkflowStepDraft[] | null;
  };
};

/**
 * Replaces a workflow definition's editable fields and child definitions. Inputs are rewritten in
 * display order, while steps are rewritten with fresh ordinals that match the submitted array.
 */
@injectable()
export class UpdateWorkflowMutation extends Mutation<UpdateWorkflowMutationArguments, GraphqlWorkflowRecord> {
  constructor(
    @inject(WorkflowService) private readonly workflowService: WorkflowService,
    @inject(WorkflowGraphqlPresenter)
    private readonly presenter: WorkflowGraphqlPresenter = new WorkflowGraphqlPresenter(),
  ) {
    super();
  }

  protected resolve = async (
    arguments_: UpdateWorkflowMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlWorkflowRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const workflow = await this.workflowService.updateWorkflow(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      description: arguments_.input.description,
      inputs: arguments_.input.inputs,
      instructions: arguments_.input.instructions,
      isEnabled: arguments_.input.isEnabled,
      name: arguments_.input.name,
      steps: arguments_.input.steps,
      workflowDefinitionId: arguments_.input.id,
    });
    return this.presenter.serializeWorkflow(workflow);
  };
}
