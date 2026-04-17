import { inject, injectable } from "inversify";
import { RoutineExecutionService } from "../../services/routines/execution.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import {
  RoutineGraphqlPresenter,
  type GraphqlRoutineRunRecord,
} from "../routine_graphql_presenter.ts";
import { Mutation } from "./mutation.ts";

type TriggerRoutineMutationArguments = {
  input: {
    id: string;
  };
};

/**
 * Executes one routine on demand so users can validate the assigned agent, sticky session, and
 * instruction payload before relying on the cron schedule.
 */
@injectable()
export class TriggerRoutineMutation extends Mutation<TriggerRoutineMutationArguments, GraphqlRoutineRunRecord> {
  private readonly presenter: RoutineGraphqlPresenter;
  private readonly routineExecutionService: RoutineExecutionService;

  constructor(
    @inject(RoutineExecutionService) routineExecutionService: RoutineExecutionService,
    @inject(RoutineGraphqlPresenter) presenter: RoutineGraphqlPresenter = new RoutineGraphqlPresenter(),
  ) {
    super();
    this.presenter = presenter;
    this.routineExecutionService = routineExecutionService;
  }

  protected resolve = async (
    arguments_: TriggerRoutineMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlRoutineRunRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const run = await this.routineExecutionService.execute(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      routineId: arguments_.input.id,
      source: "manual",
      triggerId: null,
    });

    return this.presenter.serializeRun(run);
  };
}
