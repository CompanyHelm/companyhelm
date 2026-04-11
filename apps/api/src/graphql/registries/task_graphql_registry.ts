import { inject, injectable } from "inversify";
import { CreateTaskCategoryMutation } from "../mutations/create_task_category.ts";
import { CreateTaskMutation } from "../mutations/create_task.ts";
import { DeleteTaskCategoryMutation } from "../mutations/delete_task_category.ts";
import { DeleteTaskMutation } from "../mutations/delete_task.ts";
import { ExecuteTaskMutation } from "../mutations/execute_task.ts";
import { SetTaskCategoryMutation } from "../mutations/set_task_category.ts";
import { UpdateTaskMutation } from "../mutations/update_task.ts";
import { TaskAssignableUsersQueryResolver } from "../resolvers/task_assignable_users.ts";
import { TaskCategoriesQueryResolver } from "../resolvers/task_categories.ts";
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
    @inject(CreateTaskCategoryMutation)
    private readonly createTaskCategoryMutation: CreateTaskCategoryMutation = new CreateTaskCategoryMutation(),
    @inject(SetTaskCategoryMutation)
    private readonly setTaskCategoryMutation: SetTaskCategoryMutation = new SetTaskCategoryMutation(),
    @inject(TaskAssignableUsersQueryResolver)
    private readonly taskAssignableUsersQueryResolver: TaskAssignableUsersQueryResolver =
      new TaskAssignableUsersQueryResolver(),
    @inject(TaskCategoriesQueryResolver)
    private readonly taskCategoriesQueryResolver: TaskCategoriesQueryResolver = new TaskCategoriesQueryResolver(),
    @inject(TasksQueryResolver)
    private readonly tasksQueryResolver: TasksQueryResolver = new TasksQueryResolver(),
    @inject(DeleteTaskMutation)
    private readonly deleteTaskMutation: DeleteTaskMutation = new DeleteTaskMutation(),
    @inject(DeleteTaskCategoryMutation)
    private readonly deleteTaskCategoryMutation: DeleteTaskCategoryMutation = new DeleteTaskCategoryMutation(),
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
        CreateTaskCategory: this.createTaskCategoryMutation.execute,
        DeleteTask: this.deleteTaskMutation.execute,
        DeleteTaskCategory: this.deleteTaskCategoryMutation.execute,
        ExecuteTask: this.executeTaskMutation.execute,
        SetTaskCategory: this.setTaskCategoryMutation.execute,
        UpdateTask: this.updateTaskMutation.execute,
      },
      Query: {
        Task: this.taskQueryResolver.execute,
        TaskAssignableUsers: this.taskAssignableUsersQueryResolver.execute,
        TaskCategories: this.taskCategoriesQueryResolver.execute,
        TaskRuns: this.taskRunsQueryResolver.execute,
        Tasks: this.tasksQueryResolver.execute,
      },
    };
  }
}
