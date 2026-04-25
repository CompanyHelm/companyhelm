import { inject, injectable } from "inversify";
import { WorkflowService } from "../../services/workflows/service.ts";
import { CreateWorkflowCronTriggerMutation } from "../mutations/create_workflow_cron_trigger.ts";
import { CreateWorkflowMutation } from "../mutations/create_workflow.ts";
import { DeleteWorkflowMutation } from "../mutations/delete_workflow.ts";
import { DeleteWorkflowTriggerMutation } from "../mutations/delete_workflow_trigger.ts";
import { StartWorkflowRunMutation } from "../mutations/start_workflow_run.ts";
import { UpdateWorkflowCronTriggerMutation } from "../mutations/update_workflow_cron_trigger.ts";
import { UpdateWorkflowMutation } from "../mutations/update_workflow.ts";
import { WorkflowRunQueryResolver } from "../resolvers/workflow_run.ts";
import { WorkflowRunsQueryResolver } from "../resolvers/workflow_runs.ts";
import { WorkflowQueryResolver } from "../resolvers/workflow.ts";
import { WorkflowsQueryResolver } from "../resolvers/workflows.ts";
import type { GraphqlResolverFragment, GraphqlRegistryInterface } from "./graphql_registry_interface.ts";

/**
 * Groups workflow definition and run GraphQL entrypoints behind one registry so workflow management
 * can evolve independently from task execution surfaces.
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
    @inject(CreateWorkflowCronTriggerMutation)
    private readonly createWorkflowCronTriggerMutation: CreateWorkflowCronTriggerMutation =
      new CreateWorkflowCronTriggerMutation(WorkflowGraphqlRegistry.createMissingWorkflowService(), {} as never),
    @inject(DeleteWorkflowMutation)
    private readonly deleteWorkflowMutation: DeleteWorkflowMutation =
      new DeleteWorkflowMutation(WorkflowGraphqlRegistry.createMissingWorkflowService(), {} as never),
    @inject(DeleteWorkflowTriggerMutation)
    private readonly deleteWorkflowTriggerMutation: DeleteWorkflowTriggerMutation =
      new DeleteWorkflowTriggerMutation(WorkflowGraphqlRegistry.createMissingWorkflowService(), {} as never),
    @inject(StartWorkflowRunMutation)
    private readonly startWorkflowRunMutation: StartWorkflowRunMutation =
      new StartWorkflowRunMutation(WorkflowGraphqlRegistry.createMissingWorkflowService()),
    @inject(UpdateWorkflowCronTriggerMutation)
    private readonly updateWorkflowCronTriggerMutation: UpdateWorkflowCronTriggerMutation =
      new UpdateWorkflowCronTriggerMutation(WorkflowGraphqlRegistry.createMissingWorkflowService(), {} as never),
    @inject(UpdateWorkflowMutation)
    private readonly updateWorkflowMutation: UpdateWorkflowMutation =
      new UpdateWorkflowMutation(WorkflowGraphqlRegistry.createMissingWorkflowService()),
  ) {}

  createResolvers(): GraphqlResolverFragment {
    return {
      Mutation: {
        CreateWorkflowCronTrigger: this.createWorkflowCronTriggerMutation.execute,
        CreateWorkflow: this.createWorkflowMutation.execute,
        DeleteWorkflow: this.deleteWorkflowMutation.execute,
        DeleteWorkflowTrigger: this.deleteWorkflowTriggerMutation.execute,
        StartWorkflowRun: this.startWorkflowRunMutation.execute,
        UpdateWorkflowCronTrigger: this.updateWorkflowCronTriggerMutation.execute,
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
      async createCronTrigger() {
        throw new Error("Workflow service is not configured.");
      },
      async deleteTrigger() {
        throw new Error("Workflow service is not configured.");
      },
      async deleteWorkflow() {
        throw new Error("Workflow service is not configured.");
      },
      async getCronTriggerSchedule() {
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
      async updateCronTrigger() {
        throw new Error("Workflow service is not configured.");
      },
      async updateWorkflow() {
        throw new Error("Workflow service is not configured.");
      },
    } as never;
  }
}
