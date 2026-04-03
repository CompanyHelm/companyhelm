import { inject, injectable } from "inversify";
import { TaskRunService } from "../../services/task_run_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type ExecuteTaskMutationArguments = {
  input: {
    taskId: string;
  };
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
 * Starts one agent-backed execution attempt for a task and returns the linked run/session record so
 * task screens can reflect the active execution state without an extra query round-trip.
 */
@injectable()
export class ExecuteTaskMutation extends Mutation<ExecuteTaskMutationArguments, GraphqlTaskRunRecord> {
  private readonly taskRunService: TaskRunService;

  constructor(
    @inject(TaskRunService) taskRunService: TaskRunService,
  ) {
    super();
    this.taskRunService = taskRunService;
  }

  protected resolve = async (
    arguments_: ExecuteTaskMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlTaskRunRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.taskId.length === 0) {
      throw new Error("taskId is required.");
    }

    const taskRun = await this.taskRunService.executeTask(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      taskId: arguments_.input.taskId,
      userId: context.authSession.user.id,
    });

    return {
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
    };
  };
}
