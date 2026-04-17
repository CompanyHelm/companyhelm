import { inject, injectable } from "inversify";
import { RoutineSchedulerSyncService } from "../../services/routines/scheduler_sync.ts";
import { RoutineService } from "../../services/routines/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  RoutineGraphqlPresenter,
  type GraphqlRoutineRecord,
} from "../routine_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type DeleteRoutineMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Deletes a routine and removes any BullMQ schedulers that belonged to its cron triggers.
 */
@injectable()
export class DeleteRoutineMutation extends Mutation<DeleteRoutineMutationArguments, GraphqlRoutineRecord> {
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
    arguments_: DeleteRoutineMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlRoutineRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.input.id.length === 0) {
      throw new Error("id is required.");
    }

    const routine = await this.routineService.deleteRoutine(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.id,
    );
    for (const trigger of routine.triggers) {
      await this.routineSchedulerSyncService.removeCronTrigger(trigger.id);
    }

    return this.presenter.serializeRoutine(routine);
  };
}
