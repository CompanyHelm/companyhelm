import { inject, injectable } from "inversify";
import { CreateTaskStageMutation } from "../mutations/create_task_stage.ts";
import { CreateTaskMutation } from "../mutations/create_task.ts";
import { DeleteTaskStageMutation } from "../mutations/delete_task_stage.ts";
import { DeleteTaskMutation } from "../mutations/delete_task.ts";
import { ExecuteTaskMutation } from "../mutations/execute_task.ts";
import { SetTaskStageMutation } from "../mutations/set_task_stage.ts";
import { UpdateTaskMutation } from "../mutations/update_task.ts";
import { TaskAssignableUsersQueryResolver } from "../resolvers/task_assignable_users.ts";
import { TaskStagesQueryResolver } from "../resolvers/task_stages.ts";
import { TaskQueryResolver } from "../resolvers/task.ts";
import { TaskRunsQueryResolver } from "../resolvers/task_runs.ts";
import { TasksQueryResolver } from "../resolvers/tasks.ts";
import type { GraphqlResolverFragment, GraphqlRegistryInterface } from "./graphql_registry_interface.ts";

/**
 * Keeps task queries and mutations together so task execution and task metadata no longer bloat
 * the top-level GraphQL integration class.
 */
@injectable()
export class TaskGraphqlRegistry implements GraphqlRegistryInterface {
  constructor(
    @inject(CreateTaskMutation)
    private readonly createTaskMutation: CreateTaskMutation = new CreateTaskMutation(),
    @inject(CreateTaskStageMutation)
    private readonly createTaskStageMutation: CreateTaskStageMutation = new CreateTaskStageMutation(),
    @inject(SetTaskStageMutation)
    private readonly setTaskStageMutation: SetTaskStageMutation = new SetTaskStageMutation(),
    @inject(TaskAssignableUsersQueryResolver)
    private readonly taskAssignableUsersQueryResolver: TaskAssignableUsersQueryResolver =
      new TaskAssignableUsersQueryResolver(),
    @inject(TaskStagesQueryResolver)
    private readonly taskStagesQueryResolver: TaskStagesQueryResolver = new TaskStagesQueryResolver(),
    @inject(TasksQueryResolver)
    private readonly tasksQueryResolver: TasksQueryResolver = new TasksQueryResolver(),
    @inject(DeleteTaskMutation)
    private readonly deleteTaskMutation: DeleteTaskMutation = new DeleteTaskMutation(),
    @inject(DeleteTaskStageMutation)
    private readonly deleteTaskStageMutation: DeleteTaskStageMutation = new DeleteTaskStageMutation(),
    @inject(TaskQueryResolver)
    private readonly taskQueryResolver: TaskQueryResolver = new TaskQueryResolver(),
    @inject(UpdateTaskMutation)
    private readonly updateTaskMutation: UpdateTaskMutation = new UpdateTaskMutation(),
    @inject(TaskRunsQueryResolver)
    private readonly taskRunsQueryResolver: TaskRunsQueryResolver = new TaskRunsQueryResolver({
      async executeTask() {
        throw new Error("TaskRun service is not configured.");
      },
      async listTaskRuns() {
        throw new Error("TaskRuns query is not configured.");
      },
    } as never),
    @inject(ExecuteTaskMutation)
    private readonly executeTaskMutation: ExecuteTaskMutation = new ExecuteTaskMutation({
      async executeTask() {
        throw new Error("ExecuteTask mutation is not configured.");
      },
      async listTaskRuns() {
        throw new Error("TaskRun service is not configured.");
      },
    } as never),
  ) {}

  createResolvers(): GraphqlResolverFragment {
    return {
      Mutation: {
        CreateTask: this.createTaskMutation.execute,
        CreateTaskStage: this.createTaskStageMutation.execute,
        DeleteTask: this.deleteTaskMutation.execute,
        DeleteTaskStage: this.deleteTaskStageMutation.execute,
        ExecuteTask: this.executeTaskMutation.execute,
        SetTaskStage: this.setTaskStageMutation.execute,
        UpdateTask: this.updateTaskMutation.execute,
      },
      Query: {
        Task: this.taskQueryResolver.execute,
        TaskAssignableUsers: this.taskAssignableUsersQueryResolver.execute,
        TaskStages: this.taskStagesQueryResolver.execute,
        TaskRuns: this.taskRunsQueryResolver.execute,
        Tasks: this.tasksQueryResolver.execute,
      },
    };
  }
}
