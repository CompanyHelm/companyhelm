import { inject, injectable } from "inversify";
import { TaskRunService } from "../../services/task_run_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type TaskRunsQueryArguments = {
  taskId: string;
};

type GraphqlTaskRunRecord = {
  agentId: string;
  agentName: string;
  createdAt: string;
  endedReason: string | null;
  finishedAt: string | null;
  id: string;
  lastActivityAt: string;
  sessionId: string | null;
  startedAt: string | null;
  status: string;
  taskId: string;
  updatedAt: string;
};

/**
 * Lists all recorded execution attempts for a task so the task detail page can show session-linked
 * history without re-deriving task activity from the broader chats list.
 */
@injectable()
export class TaskRunsQueryResolver {
  private readonly taskRunService: TaskRunService;

  constructor(
    @inject(TaskRunService) taskRunService: TaskRunService,
  ) {
    this.taskRunService = taskRunService;
  }

  execute = async (
    _root: unknown,
    arguments_: TaskRunsQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlTaskRunRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.taskId.length === 0) {
      throw new Error("taskId is required.");
    }

    const taskRuns = await this.taskRunService.listTaskRuns(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      taskId: arguments_.taskId,
    });

    return taskRuns.map((taskRun) => ({
      agentId: taskRun.agentId,
      agentName: taskRun.agentName,
      createdAt: taskRun.createdAt.toISOString(),
      endedReason: taskRun.endedReason,
      finishedAt: taskRun.finishedAt?.toISOString() ?? null,
      id: taskRun.id,
      lastActivityAt: taskRun.lastActivityAt.toISOString(),
      sessionId: taskRun.sessionId,
      startedAt: taskRun.startedAt?.toISOString() ?? null,
      status: taskRun.status,
      taskId: taskRun.taskId,
      updatedAt: taskRun.updatedAt.toISOString(),
    }));
  };
}
