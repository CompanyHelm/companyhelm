import { inject, injectable } from "inversify";
import {
  RoutineGraphqlPresenter,
  type GraphqlRoutineRecord,
} from "../routine_graphql_presenter.ts";
import { RoutineService } from "../../services/routines/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type RoutineQueryArguments = {
  id: string;
};

/**
 * Loads one routine with cron triggers and latest run state for detail screens and post-mutation
 * cache refreshes.
 */
@injectable()
export class RoutineQueryResolver {
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
    arguments_: RoutineQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlRoutineRecord> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    if (arguments_.id.length === 0) {
      throw new Error("id is required.");
    }

    const routine = await this.routineService.getRoutine(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.id,
    );
    return this.presenter.serializeRoutine(routine);
  };
}
