import { inject, injectable } from "inversify";
import { RoutineSchedulerSyncService } from "../../services/routines/scheduler_sync.ts";
import { RoutineService } from "../../services/routines/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  RoutineGraphqlPresenter,
  type GraphqlRoutineCronTriggerRecord,
} from "../routine_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type DeleteRoutineTriggerMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Deletes one routine trigger from the database and removes the matching BullMQ scheduler entry so
 * a stale cron wake-up cannot execute after the user removes it.
 */
@injectable()
export class DeleteRoutineTriggerMutation
  extends Mutation<DeleteRoutineTriggerMutationArguments, GraphqlRoutineCronTriggerRecord>
{
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
    arguments_: DeleteRoutineTriggerMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlRoutineCronTriggerRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const trigger = await this.routineService.deleteTrigger(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.id,
    );
    await this.routineSchedulerSyncService.removeCronTrigger(trigger.id);

    return this.presenter.serializeCronTrigger(trigger);
  };
}
