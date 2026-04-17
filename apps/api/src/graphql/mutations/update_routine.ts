import { inject, injectable } from "inversify";
import { RoutineSchedulerSyncService } from "../../services/routines/scheduler_sync.ts";
import { RoutineService } from "../../services/routines/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  RoutineGraphqlPresenter,
  type GraphqlRoutineRecord,
} from "../routine_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type UpdateRoutineMutationArguments = {
  input: {
    assignedAgentId?: string | null;
    enabled?: boolean | null;
    id: string;
    instructions?: string | null;
    name?: string | null;
  };
};

/**
 * Updates routine metadata and reconciles cron schedulers when enabled state or agent assignment
 * changes the set of triggers that should be active.
 */
@injectable()
export class UpdateRoutineMutation extends Mutation<UpdateRoutineMutationArguments, GraphqlRoutineRecord> {
  private readonly presenter: RoutineGraphqlPresenter;
  private readonly routineSchedulerSyncService: RoutineSchedulerSyncService;
  private readonly routineService: RoutineService;

  constructor(
    @inject(RoutineService) routineService: RoutineService,
    @inject(RoutineSchedulerSyncService) routineSchedulerSyncService: RoutineSchedulerSyncService,
    @inject(RoutineGraphqlPresenter) presenter: RoutineGraphqlPresenter = new RoutineGraphqlPresenter(),
  ) {
    super();
    this.presenter = presenter;
    this.routineSchedulerSyncService = routineSchedulerSyncService;
    this.routineService = routineService;
  }

  protected resolve = async (
    arguments_: UpdateRoutineMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlRoutineRecord> => {
    if (!context.authSession?.company || !context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.id.length === 0) {
      throw new Error("id is required.");
    }

    const routine = await this.routineService.updateRoutine(context.app_runtime_transaction_provider, {
      assignedAgentId: arguments_.input.assignedAgentId,
      companyId: context.authSession.company.id,
      enabled: arguments_.input.enabled,
      instructions: arguments_.input.instructions,
      name: arguments_.input.name,
      routineId: arguments_.input.id,
      userId: context.authSession.user.id,
    });
    for (const trigger of routine.triggers) {
      const schedule = await this.routineService.getCronTriggerSchedule(
        context.app_runtime_transaction_provider,
        context.authSession.company.id,
        trigger.id,
      );
      await this.routineSchedulerSyncService.syncCronTrigger(schedule, trigger.id);
    }

    return this.presenter.serializeRoutine(routine);
  };
}
