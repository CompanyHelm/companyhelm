import { injectable } from "inversify";
import type {
  WorkflowDefinitionInputRecord,
  WorkflowRecord,
  WorkflowRunRecord,
  WorkflowRunStepRecord,
  WorkflowStepDefinitionRecord,
} from "../services/workflows/types.ts";

export type GraphqlWorkflowInputRecord = {
  createdAt: string;
  defaultValue: string | null;
  description: string | null;
  id: string;
  isRequired: boolean;
  name: string;
};

export type GraphqlWorkflowStepRecord = {
  createdAt: string;
  id: string;
  instructions: string | null;
  name: string;
  ordinal: number;
  stepId: string;
};

export type GraphqlWorkflowRecord = {
  createdAt: string;
  description: string | null;
  id: string;
  inputs: GraphqlWorkflowInputRecord[];
  instructions: string | null;
  isEnabled: boolean;
  name: string;
  steps: GraphqlWorkflowStepRecord[];
  updatedAt: string;
};

export type GraphqlWorkflowRunStepRecord = {
  id: string;
  instructions: string | null;
  name: string;
  ordinal: number;
  status: string;
  workflowRunId: string;
};

export type GraphqlWorkflowRunRecord = {
  agentId: string;
  completedAt: string | null;
  createdAt: string;
  id: string;
  instructions: string | null;
  sessionId: string;
  startedAt: string | null;
  status: string;
  steps: GraphqlWorkflowRunStepRecord[];
  updatedAt: string;
  workflowDefinitionId: string | null;
};

/**
 * Converts workflow domain records into the date-string GraphQL shape consumed by Relay clients.
 * Keeping this mapping in one class avoids leaking persistence names like `instructions_template`
 * into resolvers and mutations.
 */
@injectable()
export class WorkflowGraphqlPresenter {
  serializeWorkflow(workflow: WorkflowRecord): GraphqlWorkflowRecord {
    return {
      createdAt: workflow.createdAt.toISOString(),
      description: workflow.description,
      id: workflow.id,
      inputs: workflow.inputs.map((input) => this.serializeInput(input)),
      instructions: workflow.instructions,
      isEnabled: workflow.isEnabled,
      name: workflow.name,
      steps: workflow.steps.map((step) => this.serializeStep(step)),
      updatedAt: workflow.updatedAt.toISOString(),
    };
  }

  serializeRun(run: WorkflowRunRecord): GraphqlWorkflowRunRecord {
    return {
      agentId: run.agentId,
      completedAt: run.completedAt?.toISOString() ?? null,
      createdAt: run.createdAt.toISOString(),
      id: run.id,
      instructions: run.instructions,
      sessionId: run.sessionId,
      startedAt: run.startedAt?.toISOString() ?? null,
      status: run.status,
      steps: run.steps.map((step) => this.serializeRunStep(step)),
      updatedAt: run.updatedAt.toISOString(),
      workflowDefinitionId: run.workflowDefinitionId,
    };
  }

  private serializeInput(input: WorkflowDefinitionInputRecord): GraphqlWorkflowInputRecord {
    return {
      createdAt: input.createdAt.toISOString(),
      defaultValue: input.defaultValue,
      description: input.description,
      id: input.id,
      isRequired: input.isRequired,
      name: input.name,
    };
  }

  private serializeStep(step: WorkflowStepDefinitionRecord): GraphqlWorkflowStepRecord {
    return {
      createdAt: step.createdAt.toISOString(),
      id: step.id,
      instructions: step.instructions,
      name: step.name,
      ordinal: step.ordinal,
      stepId: step.stepId,
    };
  }

  private serializeRunStep(step: WorkflowRunStepRecord): GraphqlWorkflowRunStepRecord {
    return {
      id: step.id,
      instructions: step.instructions,
      name: step.name,
      ordinal: step.ordinal,
      status: step.status,
      workflowRunId: step.workflowRunId,
    };
  }
}
