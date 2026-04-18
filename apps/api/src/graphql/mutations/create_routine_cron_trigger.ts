import { inject, injectable } from "inversify";
import { RoutineSchedulerSyncService } from "../../services/routines/scheduler_sync.ts";
import { RoutineService } from "../../services/routines/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  RoutineGraphqlPresenter,
  type GraphqlRoutineCronTriggerRecord,
} from "../routine_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type CreateRoutineCronTriggerMutationArguments = {
  input: {
    cronPattern: string;
    enabled?: boolean | null;
    routineId: string;
    timezone: string;
  };
};

/**
 * Adds one cron trigger to a routine and immediately reconciles the durable definition into the
 * BullMQ scheduler so newly-created triggers are testable without restarting the API process.
 */
@injectable()
export class CreateRoutineCronTriggerMutation
  extends Mutation<CreateRoutineCronTriggerMutationArguments, GraphqlRoutineCronTriggerRecord>
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
    arguments_: CreateRoutineCronTriggerMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlRoutineCronTriggerRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const trigger = await this.routineService.createCronTrigger(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      cronPattern: arguments_.input.cronPattern,
      enabled: arguments_.input.enabled,
      routineId: arguments_.input.routineId,
      timezone: arguments_.input.timezone,
    });
    const schedule = await this.routineService.getCronTriggerSchedule(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      trigger.id,
    );
    await this.routineSchedulerSyncService.syncCronTrigger(schedule, trigger.id);

    return this.presenter.serializeCronTrigger(trigger);
  };
}
