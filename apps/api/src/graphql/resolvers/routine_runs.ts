import { inject, injectable } from "inversify";
import {
  RoutineGraphqlPresenter,
  type GraphqlRoutineRunRecord,
} from "../routine_graphql_presenter.ts";
import { RoutineService } from "../../services/routines/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type RoutineRunsQueryArguments = {
  routineId: string;
};

/**
 * Lists execution attempts for one routine so manual tests and cron fires have auditable history
 * independent of the chat transcript they queued into.
 */
@injectable()
export class RoutineRunsQueryResolver {
  private readonly presenter: RoutineGraphqlPresenter;
  private readonly routineService: RoutineService;

  constructor(
    @inject(RoutineService) routineService: RoutineService,
    @inject(RoutineGraphqlPresenter) presenter: RoutineGraphqlPresenter = new RoutineGraphqlPresenter(),
  ) {
    this.presenter = presenter;
    this.routineService = routineService;
  }

  execute = async (
    _root: unknown,
    arguments_: RoutineRunsQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlRoutineRunRecord[]> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.routineId.length === 0) {
      throw new Error("routineId is required.");
    }

    const runs = await this.routineService.listRoutineRuns(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.routineId,
    );
    return runs.map((run) => this.presenter.serializeRun(run));
  };
}
