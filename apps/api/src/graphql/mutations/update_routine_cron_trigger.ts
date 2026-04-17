import { inject, injectable } from "inversify";
import { RoutineSchedulerSyncService } from "../../services/routines/scheduler_sync.ts";
import { RoutineService } from "../../services/routines/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  RoutineGraphqlPresenter,
  type GraphqlRoutineCronTriggerRecord,
} from "../routine_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type UpdateRoutineCronTriggerInput = {
  cronPattern?: string | null;
  enabled?: boolean | null;
  endAt?: string | null;
  id: string;
  limit?: number | null;
  startAt?: string | null;
  timezone?: string | null;
};

type UpdateRoutineCronTriggerMutationArguments = {
  input: UpdateRoutineCronTriggerInput;
};

/**
 * Updates a routine cron trigger and re-syncs BullMQ so toggles, cron edits, and date windows take
 * effect immediately without waiting for the next startup reconciliation.
 */
@injectable()
export class UpdateRoutineCronTriggerMutation
  extends Mutation<UpdateRoutineCronTriggerMutationArguments, GraphqlRoutineCronTriggerRecord>
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
    arguments_: UpdateRoutineCronTriggerMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlRoutineCronTriggerRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const trigger = await this.routineService.updateCronTrigger(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      cronPattern: arguments_.input.cronPattern,
      enabled: arguments_.input.enabled,
      endAt: this.parseOptionalDate(arguments_.input, "endAt"),
      limit: arguments_.input.limit,
      startAt: this.parseOptionalDate(arguments_.input, "startAt"),
      timezone: arguments_.input.timezone,
      triggerId: arguments_.input.id,
    });
    const schedule = await this.routineService.getCronTriggerSchedule(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      trigger.id,
    );
    await this.routineSchedulerSyncService.syncCronTrigger(schedule, trigger.id);

    return this.presenter.serializeCronTrigger(trigger);
  };

  private parseOptionalDate(
    input: UpdateRoutineCronTriggerInput,
    field: "endAt" | "startAt",
  ): Date | null | undefined {
    if (!(field in input)) {
      return undefined;
    }

    const value = input[field];
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid trigger date.");
    }
    return date;
  }
}
