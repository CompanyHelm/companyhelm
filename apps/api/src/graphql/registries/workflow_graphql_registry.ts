import { inject, injectable } from "inversify";
import { WorkflowService } from "../../services/workflows/service.ts";
import { CreateWorkflowMutation } from "../mutations/create_workflow.ts";
import { StartWorkflowRunMutation } from "../mutations/start_workflow_run.ts";
import { UpdateWorkflowMutation } from "../mutations/update_workflow.ts";
import { WorkflowRunQueryResolver } from "../resolvers/workflow_run.ts";
import { WorkflowRunsQueryResolver } from "../resolvers/workflow_runs.ts";
import { WorkflowQueryResolver } from "../resolvers/workflow.ts";
import { WorkflowsQueryResolver } from "../resolvers/workflows.ts";
import type { GraphqlResolverFragment, GraphqlRegistryInterface } from "./graphql_registry_interface.ts";

/**
 * Groups workflow definition and run GraphQL entrypoints behind one registry so workflow management
 * can evolve independently from routine and task execution surfaces.
 */
@injectable()
export class WorkflowGraphqlRegistry implements GraphqlRegistryInterface {
  constructor(
    @inject(WorkflowQueryResolver)
    private readonly workflowQueryResolver: WorkflowQueryResolver =
      new WorkflowQueryResolver(WorkflowGraphqlRegistry.createMissingWorkflowService()),
    @inject(WorkflowRunQueryResolver)
    private readonly workflowRunQueryResolver: WorkflowRunQueryResolver =
      new WorkflowRunQueryResolver(WorkflowGraphqlRegistry.createMissingWorkflowService()),
    @inject(WorkflowRunsQueryResolver)
    private readonly workflowRunsQueryResolver: WorkflowRunsQueryResolver =
      new WorkflowRunsQueryResolver(WorkflowGraphqlRegistry.createMissingWorkflowService()),
    @inject(WorkflowsQueryResolver)
    private readonly workflowsQueryResolver: WorkflowsQueryResolver =
      new WorkflowsQueryResolver(WorkflowGraphqlRegistry.createMissingWorkflowService()),
    @inject(CreateWorkflowMutation)
    private readonly createWorkflowMutation: CreateWorkflowMutation =
      new CreateWorkflowMutation(WorkflowGraphqlRegistry.createMissingWorkflowService()),
    @inject(StartWorkflowRunMutation)
    private readonly startWorkflowRunMutation: StartWorkflowRunMutation =
      new StartWorkflowRunMutation(WorkflowGraphqlRegistry.createMissingWorkflowService()),
    @inject(UpdateWorkflowMutation)
    private readonly updateWorkflowMutation: UpdateWorkflowMutation =
      new UpdateWorkflowMutation(WorkflowGraphqlRegistry.createMissingWorkflowService()),
  ) {}

  createResolvers(): GraphqlResolverFragment {
    return {
      Mutation: {
        CreateWorkflow: this.createWorkflowMutation.execute,
        StartWorkflowRun: this.startWorkflowRunMutation.execute,
        UpdateWorkflow: this.updateWorkflowMutation.execute,
      },
      Query: {
        Workflow: this.workflowQueryResolver.execute,
        WorkflowRun: this.workflowRunQueryResolver.execute,
        WorkflowRuns: this.workflowRunsQueryResolver.execute,
        Workflows: this.workflowsQueryResolver.execute,
      },
    };
  }

  private static createMissingWorkflowService(): WorkflowService {
    return {
      async createWorkflow() {
        throw new Error("Workflow service is not configured.");
      },
      async getWorkflow() {
        throw new Error("Workflow service is not configured.");
      },
      async getWorkflowRun() {
        throw new Error("Workflow service is not configured.");
      },
      async listWorkflowRuns() {
        throw new Error("Workflow service is not configured.");
      },
      async listWorkflows() {
        throw new Error("Workflow service is not configured.");
      },
      async startWorkflowRun() {
        throw new Error("Workflow service is not configured.");
      },
      async updateWorkflow() {
        throw new Error("Workflow service is not configured.");
      },
    } as never;
  }
}
