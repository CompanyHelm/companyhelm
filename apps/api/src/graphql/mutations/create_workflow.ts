import { inject, injectable } from "inversify";
import { WorkflowService } from "../../services/workflows/service.ts";
import type { WorkflowInputDraft, WorkflowStepDraft } from "../../services/workflows/types.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  WorkflowGraphqlPresenter,
  type GraphqlWorkflowRecord,
} from "../workflow_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type CreateWorkflowMutationArguments = {
  input: {
    description?: string | null;
    inputs: WorkflowInputDraft[];
    instructions?: string | null;
    isEnabled?: boolean | null;
    name: string;
    steps: WorkflowStepDraft[];
  };
};

/**
 * Creates a workflow definition together with its launch inputs and ordered step definitions in a
 * single mutation so the management UI cannot leave a partial definition behind.
 */
@injectable()
export class CreateWorkflowMutation extends Mutation<CreateWorkflowMutationArguments, GraphqlWorkflowRecord> {
  constructor(
    @inject(WorkflowService) private readonly workflowService: WorkflowService,
    @inject(WorkflowGraphqlPresenter)
    private readonly presenter: WorkflowGraphqlPresenter = new WorkflowGraphqlPresenter(),
  ) {
    super();
  }

  protected resolve = async (
    arguments_: CreateWorkflowMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlWorkflowRecord> => {
    if (!context.authSession?.company || !context.authSession.user || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const workflow = await this.workflowService.createWorkflow(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      createdByUserId: context.authSession.user.id,
      description: arguments_.input.description,
      inputs: arguments_.input.inputs,
      instructions: arguments_.input.instructions,
      isEnabled: arguments_.input.isEnabled,
      name: arguments_.input.name,
      steps: arguments_.input.steps,
    });
    return this.presenter.serializeWorkflow(workflow);
  };
}
